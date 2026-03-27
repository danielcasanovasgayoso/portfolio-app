import { google } from "googleapis";
import { randomBytes } from "crypto";

// Gmail OAuth2 configuration
const GMAIL_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GMAIL_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  "http://localhost:3000/api/auth/gmail/callback";

// Required scopes for reading Gmail
const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

/** Cookie name used to store the OAuth CSRF state nonce */
export const GMAIL_OAUTH_STATE_COOKIE = "gmail_oauth_state";

/**
 * Creates a new OAuth2 client for Gmail API access
 */
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    GMAIL_REDIRECT_URI
  );
}

/**
 * Generates the authorization URL for Gmail OAuth along with a CSRF state nonce.
 * The caller must store the nonce in a secure, HTTP-only cookie and verify it
 * in the OAuth callback to prevent CSRF attacks.
 */
export function getAuthUrl(): { url: string; state: string } {
  const oauth2Client = createOAuth2Client();
  const state = randomBytes(32).toString("hex");
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // Force consent screen to get refresh token
    state,
  });
  return { url, state };
}

/**
 * Exchanges authorization code for tokens
 */
export async function getTokensFromCode(code: string) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Creates an authenticated Gmail API client
 */
export function createGmailClient(refreshToken: string) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

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
