import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCode, GMAIL_OAUTH_STATE_COOKIE } from "@/lib/gmail";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { encryptIfConfigured } from "@/lib/crypto";
import { invalidateSettingsCache } from "@/services/settings.service";

/**
 * GET /api/auth/gmail/callback
 * Handles OAuth callback from Google, stores refresh token in user's settings
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
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

  // Validate CSRF state parameter before anything else
  const storedState = request.cookies.get(GMAIL_OAUTH_STATE_COOKIE)?.value;
  if (!storedState || !stateParam || stateParam !== storedState) {
    console.error("Gmail OAuth state mismatch — possible CSRF attack");
    return NextResponse.redirect(
      new URL(
        `/import?error=${encodeURIComponent("Invalid OAuth state. Please try again.")}`,
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

    // Encrypt refresh token before persisting
    const encryptedToken = encryptIfConfigured(tokens.refresh_token);

    // Store refresh token in user's settings
    await db.settings.upsert({
      where: { userId },
      update: {
        gmailConnected: true,
        gmailRefreshToken: encryptedToken,
      },
      create: {
        userId,
        gmailConnected: true,
        gmailRefreshToken: encryptedToken,
      },
    });
    invalidateSettingsCache(userId);

    // Redirect to import page with success message; clear the one-time state cookie
    const successResponse = NextResponse.redirect(
      new URL(
        `/import?success=${encodeURIComponent("Gmail connected successfully!")}`,
        request.url
      )
    );
    successResponse.cookies.delete(GMAIL_OAUTH_STATE_COOKIE);
    return successResponse;
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
