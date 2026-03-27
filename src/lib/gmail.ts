import { randomBytes } from "crypto";

// Gmail OAuth2 configuration
const GMAIL_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GMAIL_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  "http://localhost:3000/api/auth/gmail/callback";

// Required scopes for reading Gmail
const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

// Google OAuth2 endpoints
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";

/** Cookie name used to store the OAuth CSRF state nonce */
export const GMAIL_OAUTH_STATE_COOKIE = "gmail_oauth_state";

/**
 * Generates the authorization URL for Gmail OAuth along with a CSRF state nonce.
 * The caller must store the nonce in a secure, HTTP-only cookie and verify it
 * in the OAuth callback to prevent CSRF attacks.
 */
export function getAuthUrl(): { url: string; state: string } {
  const state = randomBytes(32).toString("hex");
  const params = new URLSearchParams({
    client_id: GMAIL_CLIENT_ID!,
    redirect_uri: GMAIL_REDIRECT_URI,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  const url = `${GOOGLE_AUTH_URL}?${params.toString()}`;
  return { url, state };
}

/**
 * Exchanges authorization code for tokens
 */
export async function getTokensFromCode(code: string) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GMAIL_CLIENT_ID!,
      client_secret: GMAIL_CLIENT_SECRET!,
      redirect_uri: GMAIL_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${error}`);
  }

  const tokens: OAuthTokens = await response.json();
  return tokens;
}

/**
 * Refreshes an access token using a refresh token.
 * Returns a short-lived access token for Gmail API calls.
 */
export async function getAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GMAIL_CLIENT_ID!,
      client_secret: GMAIL_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${error}`);
  }

  const data: { access_token: string } = await response.json();
  return data.access_token;
}

/**
 * Makes an authenticated GET request to the Gmail API.
 */
export async function gmailApiFetch<T>(
  accessToken: string,
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${GMAIL_API_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gmail API error (${response.status}): ${error}`);
  }

  return response.json();
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OAuthTokens {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
  expires_in?: number;
  id_token?: string;
}

export interface GmailMessagePartBody {
  attachmentId?: string;
  size?: number;
  data?: string;
}

export interface GmailHeader {
  name?: string;
  value?: string;
}

export interface GmailMessagePart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: GmailMessagePartBody;
  parts?: GmailMessagePart[];
}

export interface GmailMessage {
  id?: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  payload?: GmailMessagePart;
  sizeEstimate?: number;
  historyId?: string;
  internalDate?: string;
}

export interface GmailMessageListResponse {
  messages?: Array<{ id?: string; threadId?: string }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export interface GmailProfile {
  emailAddress?: string;
  messagesTotal?: number;
  threadsTotal?: number;
  historyId?: string;
}

// ─── Query constants ────────────────────────────────────────────────────────

/**
 * MyInvestor email query constants
 */
export const MYINVESTOR_QUERIES = {
  // All notifications from MyInvestor
  ALL: "from:notificaciones@myinvestor.es",
  // Fund operations (buy/sell)
  OPERATIONS:
    'from:notificaciones@myinvestor.es subject:"CONFIRMACIÓN DE OPERACIÓN DE VALORES"',
  // Pension plan contributions
  PENSIONS:
    'from:notificaciones@myinvestor.es subject:"APORTACION A PLANES DE PENSIONES"',
  // Interest/dividend settlements
  DIVIDENDS:
    'from:notificaciones@myinvestor.es subject:"liquidacion cuenta corriente"',
};

/**
 * Email types to skip during import
 */
export const SKIP_PATTERNS = [
  "TRANSFERENCIA SEPA",
  "Resguardo contratación",
  "Modificación de comisiones",
  "LIQUIDACION CUENTA CORRIENTE",
  "LIQUIDACIÓN CUENTA CORRIENTE",
];
