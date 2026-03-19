import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ isin: string }> }
) {
  const { isin } = await params;

  const asset = await db.asset.findFirst({
    where: { isin },
    include: {
      transactions: {
        orderBy: { date: "asc" },
      },
      holding: true,
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  let totalShares = 0;
  const transactionDetails = asset.transactions.map((t) => {
    const shares = Number(t.shares);
    const isOut =
      t.type === "SELL" || (t.type === "TRANSFER" && t.transferType === "OUT");
    const delta = isOut ? -shares : shares;
    totalShares += delta;
    return {
      date: t.date.toISOString().split("T")[0],
      type: t.type,
      transferType: t.transferType,
      shares: shares,
      delta: delta,
      runningTotal: totalShares,
    };
  });

  return NextResponse.json({
    asset: {
      id: asset.id,
      name: asset.name,
      isin: asset.isin,
    },
    transactionCount: asset.transactions.length,
    calculatedShares: totalShares,
    holdingShares: asset.holding ? Number(asset.holding.shares) : null,
    holdingCostBasis: asset.holding ? Number(asset.holding.costBasis) : null,
    transactions: transactionDetails,
  });
}
