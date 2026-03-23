import { NextResponse, after } from "next/server";
import { refreshAllData } from "@/services/price.service";
import { getUserId } from "@/lib/auth";

/**
 * POST /api/prices/refresh
 * Triggers an async price refresh for all holdings (latest + historical).
 * Returns immediately; work runs in the background via next/server after().
 */
export async function POST() {
  try {
    const userId = await getUserId();

    after(async () => {
      try {
        await refreshAllData(userId, { forceRefresh: true });
      } catch (error) {
        console.error("[API] Background price refresh failed:", error);
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
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
      },
      { status: 500 }
    );
  }
}
