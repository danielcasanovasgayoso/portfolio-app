import { db } from "@/lib/db";
import { resolveIsinToSymbol } from "@/lib/eodhd";
import { getSettings } from "../settings.service";

export async function resolveAssetTicker(
  userId: string,
  assetId: string,
  isin: string
): Promise<string | null> {
  const settings = await getSettings(userId);

  try {
    const resolved = await resolveIsinToSymbol(isin, {
      apiKey: settings.eodhdApiKey,
    });

    if (resolved) {
      const updateData: { ticker: string; name?: string } = {
        ticker: resolved.symbol,
      };

      if (resolved.name) {
        const asset = await db.asset.findUnique({ where: { id: assetId } });
        if (asset && asset.name === asset.isin) {
          updateData.name = resolved.name;
        }
      }

      await db.asset.update({
        where: { id: assetId },
        data: updateData,
      });
      return resolved.symbol;
    }

    return null;
  } catch {
    return null;
  }
}

export async function resolveAllMissingTickers(userId: string): Promise<{
  resolved: number;
  failed: number;
  results: Array<{ isin: string; ticker: string | null; error?: string }>;
}> {
  const assetsWithoutTickers = await db.asset.findMany({
    where: { userId, ticker: null, isActive: true },
  });

  const results: Array<{ isin: string; ticker: string | null; error?: string }> = [];
  let resolved = 0;
  let failed = 0;

  for (const asset of assetsWithoutTickers) {
    try {
      const ticker = await resolveAssetTicker(userId, asset.id, asset.isin);
      if (ticker) {
        resolved++;
        results.push({ isin: asset.isin, ticker });
      } else {
        failed++;
        results.push({ isin: asset.isin, ticker: null, error: "Resolution failed" });
      }
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : String(error);
      results.push({ isin: asset.isin, ticker: null, error: message });
    }
  }

  return { resolved, failed, results };
}
