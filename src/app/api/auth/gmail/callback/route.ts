import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCode } from "@/lib/gmail";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

/**
 * GET /api/auth/gmail/callback
 * Handles OAuth callback from Google, stores refresh token in user's settings
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    console.error("Gmail OAuth error:", error);
    return NextResponse.redirect(
      new URL(
        `/import?error=${encodeURIComponent("Gmail authorization was denied")}`,
        request.url
      )
    );
  }

  // Validate authorization code
  if (!code) {
    return NextResponse.redirect(
      new URL(
        `/import?error=${encodeURIComponent("No authorization code received")}`,
        request.url
      )
    );
  }

  try {
    // Get authenticated user
    const userId = await getUserId();

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    if (!tokens.refresh_token) {
      console.error("No refresh token received from Google");
      return NextResponse.redirect(
        new URL(
          `/import?error=${encodeURIComponent("Failed to get refresh token. Please try again.")}`,
          request.url
        )
      );
    }

    // Store refresh token in user's settings
    await db.settings.upsert({
      where: { userId },
      update: {
        gmailConnected: true,
        gmailRefreshToken: tokens.refresh_token,
      },
      create: {
        userId,
        gmailConnected: true,
        gmailRefreshToken: tokens.refresh_token,
      },
    });

    // Redirect to import page with success message
    return NextResponse.redirect(
      new URL(
        `/import?success=${encodeURIComponent("Gmail connected successfully!")}`,
        request.url
      )
    );
  } catch (error) {
    // Check if it's an auth error
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    console.error("Failed to exchange Gmail auth code:", error);
    return NextResponse.redirect(
      new URL(
        `/import?error=${encodeURIComponent("Failed to connect Gmail. Please try again.")}`,
        request.url
      )
    );
  }
}
