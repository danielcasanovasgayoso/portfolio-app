import { createGmailClient, MYINVESTOR_QUERIES } from "@/lib/gmail";
import type { GmailEmail } from "@/types/import";
import { gmail_v1 } from "googleapis";

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
  const gmail = createGmailClient(refreshToken);
  const { afterDate, maxResults = 100 } = options;

  // Build query with optional date filter
  let query = MYINVESTOR_QUERIES.ALL;
  if (afterDate) {
    const dateStr = afterDate.toISOString().split("T")[0].replace(/-/g, "/");
    query += ` after:${dateStr}`;
  }

  console.log("[GMAIL-FETCH] Starting email fetch");
  console.log("[GMAIL-FETCH] Query:", query);
  console.log("[GMAIL-FETCH] Max results:", maxResults);

  const emails: GmailEmail[] = [];
  let pageToken: string | undefined;
  let pageCount = 0;

  do {
    pageCount++;
    console.log(`[GMAIL-FETCH] Fetching page ${pageCount}...`);

    const response = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: Math.min(maxResults - emails.length, 100),
      pageToken,
    });

    const messages = response.data.messages || [];
    console.log(`[GMAIL-FETCH] Page ${pageCount}: Found ${messages.length} messages`);

    // Fetch full email details for each message
    for (const message of messages) {
      if (emails.length >= maxResults) {
        console.log(`[GMAIL-FETCH] Reached max results limit (${maxResults}), stopping`);
        break;
      }

      const fullEmail = await fetchEmailDetails(gmail, message.id!);
      if (fullEmail) {
        // Log summary of each email
        const subjectPreview = fullEmail.subject.substring(0, 80);
        const dateStr = fullEmail.date.toISOString().split("T")[0];
        console.log(`[GMAIL-FETCH] Email: ${dateStr} | ${subjectPreview}...`);
        emails.push(fullEmail);
      }
    }

    pageToken = response.data.nextPageToken || undefined;
    console.log(`[GMAIL-FETCH] Page ${pageCount} complete. Total emails so far: ${emails.length}, hasNextPage: ${!!pageToken}`);
  } while (pageToken && emails.length < maxResults);

  console.log(`[GMAIL-FETCH] Fetch complete. Total emails fetched: ${emails.length}`);

  // Log all fetched emails with TRASPASO in subject for easy debugging
  const transferEmails = emails.filter(e => e.subject.toUpperCase().includes("TRASPASO"));
  console.log(`[GMAIL-FETCH] Transfer emails found: ${transferEmails.length}`);
  transferEmails.forEach((e, i) => {
    console.log(`[GMAIL-FETCH] Transfer #${i + 1}: ${e.date.toISOString().split("T")[0]} | ${e.subject.substring(0, 100)}`);
  });

  return emails;
}

/**
 * Fetches full email details including body
 */
async function fetchEmailDetails(
  gmail: gmail_v1.Gmail,
  messageId: string
): Promise<GmailEmail | null> {
  try {
    const response = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    const message = response.data;
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
function extractHtmlBody(payload?: gmail_v1.Schema$MessagePart): string {
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
    const gmail = createGmailClient(refreshToken);
    await gmail.users.getProfile({ userId: "me" });
    return true;
  } catch {
    return false;
  }
}
