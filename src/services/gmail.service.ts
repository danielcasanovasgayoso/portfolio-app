import {
  getAccessToken,
  gmailApiFetch,
  MYINVESTOR_QUERIES,
} from "@/lib/gmail";
import type {
  GmailMessage,
  GmailMessageListResponse,
  GmailMessagePart,
  GmailProfile,
} from "@/lib/gmail";
import type { GmailEmail } from "@/types/import";

/**
 * Fetches MyInvestor notification emails from Gmail
 */
export async function fetchMyInvestorEmails(
  refreshToken: string,
  options: {
    afterDate?: Date;
    maxResults?: number;
  } = {}
): Promise<GmailEmail[]> {
  const accessToken = await getAccessToken(refreshToken);
  const { afterDate, maxResults = 100 } = options;

  // Build query with optional date filter
  let query = MYINVESTOR_QUERIES.ALL;
  if (afterDate) {
    const dateStr = afterDate.toISOString().split("T")[0].replace(/-/g, "/");
    query += ` after:${dateStr}`;
  }

  const emails: GmailEmail[] = [];
  let pageToken: string | undefined;

  do {
    const params: Record<string, string> = {
      q: query,
      maxResults: String(Math.min(maxResults - emails.length, 100)),
    };
    if (pageToken) {
      params.pageToken = pageToken;
    }

    const response = await gmailApiFetch<GmailMessageListResponse>(
      accessToken,
      "/users/me/messages",
      params
    );

    const messages = response.messages || [];

    // Fetch full email details for each message
    for (const message of messages) {
      if (emails.length >= maxResults) break;

      const fullEmail = await fetchEmailDetails(accessToken, message.id!);
      if (fullEmail) {
        emails.push(fullEmail);
      }
    }

    pageToken = response.nextPageToken || undefined;
  } while (pageToken && emails.length < maxResults);

  return emails;
}

/**
 * Fetches full email details including body
 */
async function fetchEmailDetails(
  accessToken: string,
  messageId: string
): Promise<GmailEmail | null> {
  try {
    const message = await gmailApiFetch<GmailMessage>(
      accessToken,
      `/users/me/messages/${encodeURIComponent(messageId)}`,
      { format: "full" }
    );

    const headers = message.payload?.headers || [];

    // Extract headers
    const subject =
      headers.find((h) => h.name?.toLowerCase() === "subject")?.value || "";
    const dateStr =
      headers.find((h) => h.name?.toLowerCase() === "date")?.value || "";

    // Parse date
    let date: Date;
    try {
      date = new Date(dateStr);
    } catch {
      date = new Date();
    }

    // Extract HTML body
    const body = extractHtmlBody(message.payload);

    return {
      id: messageId,
      threadId: message.threadId || messageId,
      subject,
      date,
      body,
    };
  } catch (error) {
    console.error(`Failed to fetch email ${messageId}:`, error);
    return null;
  }
}

/**
 * Extracts HTML body from email payload
 */
function extractHtmlBody(payload?: GmailMessagePart): string {
  if (!payload) return "";

  // Check if this part is HTML
  if (payload.mimeType === "text/html" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }

  // Check parts recursively
  if (payload.parts) {
    for (const part of payload.parts) {
      const html = extractHtmlBody(part);
      if (html) return html;
    }
  }

  // Fallback to plain text if no HTML
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }

  return "";
}

/**
 * Checks if Gmail connection is valid by testing API access
 */
export async function testGmailConnection(
  refreshToken: string
): Promise<boolean> {
  try {
    const accessToken = await getAccessToken(refreshToken);
    await gmailApiFetch<GmailProfile>(accessToken, "/users/me/profile");
    return true;
  } catch {
    return false;
  }
}
