import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/gmail";

/**
 * GET /api/auth/gmail
 * Initiates Gmail OAuth flow by redirecting to Google's consent screen
 */
export async function GET() {
  try {
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
    console.error("Failed to generate Gmail auth URL:", error);
    return NextResponse.json(
      { error: "Failed to initiate Gmail authentication" },
      { status: 500 }
    );
  }
}
