import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ isin: string }> }
) {
  try {
    // Get authenticated user
    const userId = await getUserId();
    const { isin } = await params;

    // Only find assets belonging to this user
    const asset = await db.asset.findFirst({
      where: { isin, userId },
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
  } catch (error) {
    // Check if it's an auth error
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.error("[API] Debug asset failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
