import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { refreshAllPrices } from "@/services/price.service";
import { getUserId } from "@/lib/auth";

/**
 * POST /api/prices/refresh
 * Manually trigger a price refresh for all holdings of the authenticated user
 */
export async function POST() {
  try {
    // Get authenticated user
    const userId = await getUserId();

    // Enable ISIN resolution for assets without tickers
    const result = await refreshAllPrices(userId, { resolveIsins: true });

    // Revalidate cached pages so the summary screen shows updated prices
    revalidatePath("/");
    revalidatePath("/portfolio", "layout");

    return NextResponse.json({
      success: result.success,
      updated: result.updated,
      fromCache: result.fromCache,
      errors: result.errors,
      results: result.results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Check if it's an auth error
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

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
