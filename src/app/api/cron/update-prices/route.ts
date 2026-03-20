import { NextRequest, NextResponse } from "next/server";
import { refreshAllPrices } from "@/services/price.service";
import { db } from "@/lib/db";

/**
 * Vercel Cron Job endpoint for updating prices
 * Schedule: 0 18 * * 1-5 (weekdays at 6PM CET)
 *
 * This endpoint is protected by CRON_SECRET to prevent unauthorized access.
 * Updates prices for ALL users.
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

  console.log("[CRON] Starting price update job for all users...");

  try {
    // Get all users with holdings (active users)
    const usersWithHoldings = await db.holding.findMany({
      select: { userId: true },
      distinct: ["userId"],
    });

    const userIds = usersWithHoldings.map((h) => h.userId);
    console.log(`[CRON] Found ${userIds.length} users with holdings`);

    const results: Array<{
      userId: string;
      success: boolean;
      updated: number;
      fromCache: number;
      errors: string[];
    }> = [];

    // Update prices for each user
    for (const userId of userIds) {
      try {
        const result = await refreshAllPrices(userId);
        results.push({
          userId,
          success: result.success,
          updated: result.updated,
          fromCache: result.fromCache,
          errors: result.errors,
        });
        console.log(`[CRON] User ${userId}: updated=${result.updated}, cached=${result.fromCache}`);
      } catch (error) {
        console.error(`[CRON] Failed for user ${userId}:`, error);
        results.push({
          userId,
          success: false,
          updated: 0,
          fromCache: 0,
          errors: [error instanceof Error ? error.message : "Unknown error"],
        });
      }
    }

    const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
    const totalCached = results.reduce((sum, r) => sum + r.fromCache, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log("[CRON] Price update completed:", {
      users: userIds.length,
      totalUpdated,
      totalCached,
      totalErrors,
    });

    return NextResponse.json({
      success: totalErrors === 0,
      users: userIds.length,
      totalUpdated,
      totalCached,
      totalErrors,
      results,
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

// Allow POST as well for manual triggers (requires CRON_SECRET)
export async function POST(request: NextRequest) {
  return GET(request);
}
