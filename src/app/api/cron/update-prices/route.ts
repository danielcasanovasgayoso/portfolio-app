import { NextRequest, NextResponse } from "next/server";
import { refreshAllPrices } from "@/services/price.service";

/**
 * Vercel Cron Job endpoint for updating prices
 * Schedule: 0 18 * * 1-5 (weekdays at 6PM CET)
 *
 * This endpoint is protected by CRON_SECRET to prevent unauthorized access.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  console.log("[CRON] Starting price update job...");

  try {
    const result = await refreshAllPrices();

    console.log("[CRON] Price update completed:", {
      updated: result.updated,
      fromCache: result.fromCache,
      errors: result.errors.length,
    });

    return NextResponse.json({
      success: result.success,
      updated: result.updated,
      fromCache: result.fromCache,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CRON] Price update failed:", error);

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

// Allow POST as well for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
