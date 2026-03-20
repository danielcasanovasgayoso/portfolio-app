import { NextRequest, NextResponse } from "next/server";
import { getPriceHistory } from "@/services/price.service";

/**
 * GET /api/prices/[assetId]
 * Get price history for an asset
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;

  // Parse query params for date range
  const { searchParams } = new URL(request.url);
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const limitStr = searchParams.get("limit");

  const options: { from?: Date; to?: Date; limit?: number } = {};

  if (fromStr) {
    options.from = new Date(fromStr);
  }

  if (toStr) {
    options.to = new Date(toStr);
  }

  if (limitStr) {
    options.limit = parseInt(limitStr, 10);
  }

  try {
    const prices = await getPriceHistory(assetId, options);

    return NextResponse.json({
      success: true,
      assetId,
      count: prices.length,
      prices: prices.map((p) => ({
        date: p.date.toISOString().split("T")[0],
        close: p.close,
        open: p.open,
        high: p.high,
        low: p.low,
      })),
    });
  } catch (error) {
    console.error("[API] Get price history failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
