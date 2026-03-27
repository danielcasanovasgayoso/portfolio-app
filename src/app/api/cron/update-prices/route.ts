import { NextRequest, NextResponse } from "next/server";
import { refreshAllPrices } from "@/services/price.service";
import { db } from "@/lib/db";

/**
 * Vercel Cron Job endpoint for updating prices
 * Schedule: 0 18 * * 1-5 (weekdays at 6PM CET)
 *
 * Protected by CRON_SECRET to prevent unauthorized access.
 * Updates prices for ALL users with active holdings.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Fail closed: if CRON_SECRET is not configured, deny all requests
  // to prevent the endpoint from being publicly accessible.
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const usersWithHoldings = await db.holding.findMany({
      select: { userId: true },
      distinct: ["userId"],
    });

    const userIds = usersWithHoldings.map((h) => h.userId);

    const results: Array<{
      userId: string;
      success: boolean;
      updated: number;
      fromCache: number;
      errors: string[];
    }> = [];

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
      } catch (error) {
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

export async function POST(request: NextRequest) {
  return GET(request);
}
