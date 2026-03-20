import { NextResponse } from "next/server";
import { refreshAllPrices } from "@/services/price.service";

/**
 * POST /api/prices/refresh
 * Manually trigger a price refresh for all holdings
 */
export async function POST() {
  try {
    // Enable ISIN resolution for assets without tickers
    const result = await refreshAllPrices({ resolveIsins: true });

    return NextResponse.json({
      success: result.success,
      updated: result.updated,
      fromCache: result.fromCache,
      errors: result.errors,
      results: result.results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API] Price refresh failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
