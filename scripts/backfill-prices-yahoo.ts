/**
 * Backfill 2 years of historical prices from Yahoo Finance.
 *
 * Usage:
 *   DRY RUN (default) — lists what Yahoo can/can't resolve:
 *     npx tsx scripts/backfill-prices-yahoo.ts [--user-id=<uuid>]
 *
 *   EXECUTE — writes prices into the Price table:
 *     npx tsx scripts/backfill-prices-yahoo.ts --execute [--user-id=<uuid>] [--overwrite]
 *
 * Flags:
 *   --execute     actually write to DB (otherwise dry-run)
 *   --overwrite   overwrite existing Price rows (otherwise skip dates already present)
 *   --user-id=X   target a specific user (otherwise picks the user with most active holdings)
 *   --all-users   process every user with active holdings, not just one
 *   --years=N     history window (default 2)
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Decimal } from "@prisma/client/runtime/client";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

const args = new Set(process.argv.slice(2));
const EXECUTE = args.has("--execute");
const OVERWRITE = args.has("--overwrite");
const ALL_USERS = args.has("--all-users");
const USER_ID_ARG = [...args].find((a) => a.startsWith("--user-id="))?.split("=")[1];
const YEARS = Number([...args].find((a) => a.startsWith("--years="))?.split("=")[1] ?? 2);

// Silence yahoo-finance2 survey notice and schema warnings
try {
  (yahooFinance as unknown as { suppressNotices?: (n: string[]) => void }).suppressNotices?.([
    "yahooSurvey",
    "ripHistorical",
  ]);
} catch {
  // older/newer API — ignore
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

interface AssetRow {
  id: string;
  isin: string;
  ticker: string | null;
  name: string;
  userId: string;
}

interface ResolveResult {
  asset: AssetRow;
  yahooSymbol: string | null;
  method: "ticker" | "0p-frankfurt" | "isin-search" | "failed";
  reason?: string;
}

async function tryQuote(symbol: string): Promise<string | null> {
  try {
    const q = await yahooFinance.quote(symbol);
    return q?.symbol ?? null;
  } catch {
    return null;
  }
}

async function pickUsers(): Promise<string[]> {
  if (USER_ID_ARG) return [USER_ID_ARG];
  const grouped = await prisma.holding.groupBy({
    by: ["userId"],
    where: { shares: { gt: 0 } },
    _count: { userId: true },
    orderBy: { _count: { userId: "desc" } },
  });
  if (grouped.length === 0) throw new Error("No users with active holdings");
  if (ALL_USERS) return grouped.map((g) => g.userId);
  const picked = grouped[0].userId;
  console.log(`No --user-id given; defaulting to user with most holdings: ${picked}`);
  return [picked];
}

async function loadActiveAssets(userId: string): Promise<AssetRow[]> {
  const holdings = await prisma.holding.findMany({
    where: { userId, shares: { gt: 0 } },
    include: { asset: true },
  });
  return holdings
    .filter((h) => !h.asset.manualPricing)
    .map((h) => ({
      id: h.asset.id,
      isin: h.asset.isin,
      ticker: h.asset.ticker,
      name: h.asset.name,
      userId: h.userId,
    }));
}

/**
 * Try to locate a working Yahoo symbol for an asset.
 * Strategy:
 *   1. If ticker is not .EUFUND, try it directly (Yahoo uses compatible suffixes: .AS, .DE, .MC, .MI, .L...).
 *   2. Otherwise, search Yahoo by ISIN and take the first quote with OHLC history support.
 */
async function resolveYahooSymbol(asset: AssetRow): Promise<ResolveResult> {
  const { ticker } = asset;

  // 1. Try ticker as-is (works for real exchange listings: .AS, .DE, .L, .MI, etc.)
  if (ticker && !ticker.endsWith(".EUFUND")) {
    const direct = await tryQuote(ticker);
    if (direct) return { asset, yahooSymbol: direct, method: "ticker" };
  }

  // 2. Morningstar 0P* codes: try Frankfurt listing directly (pension plans, Spanish fund share classes).
  //    These often aren't indexed by ISIN search but resolve as <code>.F on Yahoo.
  const zeroP = ticker?.match(/^(0P[0-9A-Z]+)\b/)?.[1];
  if (zeroP) {
    const frankfurt = await tryQuote(`${zeroP}.F`);
    if (frankfurt) return { asset, yahooSymbol: frankfurt, method: "0p-frankfurt" };
  }

  // 2b. Same instrument, different exchange listing: if the ticker's own suffix didn't resolve
  //     (e.g. ".STU" delisted/unsupported on Yahoo), retry the same base symbol on other EU
  //     exchanges it's commonly cross-listed on before falling back to a generic ISIN search.
  if (ticker && ticker.includes(".") && !ticker.endsWith(".EUFUND")) {
    const base = ticker.slice(0, ticker.lastIndexOf("."));
    for (const suffix of [".DE", ".MI", ".AS", ".MC", ".PA", ".L"]) {
      const alt = await tryQuote(`${base}${suffix}`);
      if (alt) return { asset, yahooSymbol: alt, method: "ticker" };
    }
  }

  // 3. ISIN search fallback. Prefer a symbol that embeds the ISIN itself (e.g. "IE00B579F325.SG")
  //    over an unrelated ticker that merely shares the fund family name — Yahoo's search sometimes
  //    ranks a different listing/instrument (different currency, different ISIN) first.
  try {
    const res = await yahooFinance.search(asset.isin, { quotesCount: 5, newsCount: 0 });
    const candidates = (res.quotes ?? []).filter(
      (q: unknown): q is { symbol: string } =>
        typeof q === "object" && q !== null && "symbol" in q && typeof (q as { symbol: unknown }).symbol === "string"
    );
    const isinMatch = candidates.find((q) => q.symbol.includes(asset.isin));
    const picked = isinMatch ?? candidates[0];
    if (picked?.symbol) {
      return { asset, yahooSymbol: picked.symbol, method: "isin-search" };
    }
  } catch (e) {
    return {
      asset,
      yahooSymbol: null,
      method: "failed",
      reason: e instanceof Error ? e.message : String(e),
    };
  }

  return { asset, yahooSymbol: null, method: "failed", reason: "no match" };
}

interface YahooBar {
  date: Date;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

async function fetchYahooHistory(symbol: string, years: number): Promise<YahooBar[]> {
  const from = new Date();
  from.setFullYear(from.getFullYear() - years);
  const result = await yahooFinance.chart(symbol, {
    period1: from,
    period2: new Date(),
    interval: "1d",
  });
  return (result.quotes ?? []).map((q) => ({
    date: q.date,
    open: q.open ?? null,
    high: q.high ?? null,
    low: q.low ?? null,
    close: q.close ?? null,
    volume: q.volume ?? null,
  }));
}

async function writePrices(assetId: string, bars: YahooBar[]): Promise<{ inserted: number; skipped: number }> {
  if (bars.length === 0) return { inserted: 0, skipped: 0 };

  const validBars = bars.filter((b) => b.close !== null && !Number.isNaN(b.close));
  if (validBars.length === 0) return { inserted: 0, skipped: 0 };

  // Normalize to UTC midnight to match existing DB convention (see parseEODHDDate)
  const normalized = validBars.map((b) => {
    const d = new Date(Date.UTC(b.date.getUTCFullYear(), b.date.getUTCMonth(), b.date.getUTCDate()));
    return { ...b, date: d };
  });

  if (!OVERWRITE) {
    const existing = await prisma.price.findMany({
      where: { assetId, date: { in: normalized.map((n) => n.date) } },
      select: { date: true },
    });
    const existingSet = new Set(existing.map((e) => e.date.toISOString()));
    const toInsert = normalized.filter((n) => !existingSet.has(n.date.toISOString()));
    await prisma.price.createMany({
      data: toInsert.map((n) => ({
        assetId,
        date: n.date,
        open: n.open !== null ? new Decimal(n.open) : null,
        high: n.high !== null ? new Decimal(n.high) : null,
        low: n.low !== null ? new Decimal(n.low) : null,
        close: new Decimal(n.close!),
        volume: n.volume !== null ? BigInt(Math.round(n.volume)) : null,
        source: "EODHD", // keep enum compatible; Yahoo-sourced rows still flagged as external
      })),
      skipDuplicates: true,
    });
    return { inserted: toInsert.length, skipped: normalized.length - toInsert.length };
  }

  // OVERWRITE: delete dates in range then insert
  await prisma.price.deleteMany({
    where: { assetId, date: { in: normalized.map((n) => n.date) } },
  });
  await prisma.price.createMany({
    data: normalized.map((n) => ({
      assetId,
      date: n.date,
      open: n.open !== null ? new Decimal(n.open) : null,
      high: n.high !== null ? new Decimal(n.high) : null,
      low: n.low !== null ? new Decimal(n.low) : null,
      close: new Decimal(n.close!),
      volume: n.volume !== null ? BigInt(Math.round(n.volume)) : null,
      source: "EODHD",
    })),
    skipDuplicates: true,
  });
  return { inserted: normalized.length, skipped: 0 };
}

async function main() {
  console.log(
    `Mode: ${EXECUTE ? "EXECUTE" : "DRY RUN"}   overwrite=${OVERWRITE}   years=${YEARS}   all-users=${ALL_USERS}`
  );
  const userIds = await pickUsers();

  let grandInserted = 0;
  let grandSkipped = 0;
  let grandResolvable = 0;
  let grandUnresolved = 0;

  for (const userId of userIds) {
    const assets = await loadActiveAssets(userId);
    console.log(`\n=== User ${userId}: ${assets.length} active traded assets ===`);

    const resolved: ResolveResult[] = [];
    for (const asset of assets) {
      const r = await resolveYahooSymbol(asset);
      resolved.push(r);
      const tag = r.yahooSymbol ? `✓ ${r.yahooSymbol.padEnd(22)} (${r.method})` : `✗ ${r.reason ?? "failed"}`;
      console.log(`  ${tag}  ← ${asset.ticker ?? asset.isin}  ${asset.name}`);
    }

    const ok = resolved.filter((r) => r.yahooSymbol);
    const failed = resolved.filter((r) => !r.yahooSymbol);
    grandResolvable += ok.length;
    grandUnresolved += failed.length;
    console.log(`Resolution: ${ok.length} resolvable, ${failed.length} unresolved`);

    if (!EXECUTE) continue;

    console.log(`Fetching ${YEARS}y history from Yahoo and writing to DB...`);
    for (const r of ok) {
      try {
        const bars = await fetchYahooHistory(r.yahooSymbol!, YEARS);
        const { inserted, skipped } = await writePrices(r.asset.id, bars);
        grandInserted += inserted;
        grandSkipped += skipped;
        console.log(`  ${r.yahooSymbol}: ${bars.length} bars → inserted=${inserted} skipped=${skipped}`);
      } catch (e) {
        console.log(`  ${r.yahooSymbol}: ERROR ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  console.log(`\nOverall resolution: ${grandResolvable} resolvable, ${grandUnresolved} unresolved`);
  if (!EXECUTE) {
    console.log("Dry run complete — rerun with --execute to write prices.");
    return;
  }
  console.log(`Done. inserted=${grandInserted} skipped=${grandSkipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
