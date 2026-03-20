import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/gmail";
import { getUserId } from "@/lib/auth";

/**
 * GET /api/auth/gmail
 * Initiates Gmail OAuth flow by redirecting to Google's consent screen
 * Requires authenticated user
 */
export async function GET() {
  try {
    // Verify user is authenticated
    await getUserId();

    // Check if Google credentials are configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        {
          error: "Gmail OAuth not configured",
          message:
            "Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables",
        },
        { status: 500 }
      );
    }

    const authUrl = getAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    // Check if it's an auth error
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.redirect("/login");
    }

    console.error("Failed to generate Gmail auth URL:", error);
    return NextResponse.json(
      { error: "Failed to initiate Gmail authentication" },
      { status: 500 }
    );
  }
}
