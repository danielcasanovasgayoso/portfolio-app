"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fetchMyInvestorEmails, testGmailConnection } from "@/services/gmail.service";
import { parseMyInvestorEmails } from "@/services/myinvestor-parser.service";
import type { ActionResult } from "@/types/transaction";
import type {
  ImportBatchSummary,
  ImportPreviewItem,
  ImportResult,
  ParsedEmail,
} from "@/types/import";
import { Decimal } from "@prisma/client/runtime/client";
import { recalculateHolding } from "@/services/holdings.service";
import { determineAssetCategory } from "@/lib/myinvestor-funds";

/**
 * Check if Gmail is connected
 */
export async function checkGmailConnection(): Promise<
  ActionResult<{ connected: boolean; canFetch: boolean }>
> {
  try {
    const settings = await db.settings.findUnique({
      where: { id: "default" },
    });

    if (!settings?.gmailConnected || !settings.gmailRefreshToken) {
      return { success: true, data: { connected: false, canFetch: false } };
    }

    // Test the connection
    const canFetch = await testGmailConnection(settings.gmailRefreshToken);

    return { success: true, data: { connected: true, canFetch } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to check Gmail connection",
    };
  }
}

/**
 * Disconnect Gmail
 */
export async function disconnectGmail(): Promise<ActionResult<void>> {
  try {
    await db.settings.update({
      where: { id: "default" },
      data: {
        gmailConnected: false,
        gmailRefreshToken: null,
      },
    });

    revalidatePath("/import");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to disconnect Gmail",
    };
  }
}

/**
 * Fetch and parse emails from Gmail, create an import batch
 */
export async function fetchGmailTransactions(options?: {
  afterDate?: Date;
  maxResults?: number;
}): Promise<ActionResult<{ batchId: string; summary: ImportBatchSummary }>> {
  try {
    // Get refresh token from settings
    const settings = await db.settings.findUnique({
      where: { id: "default" },
    });

    if (!settings?.gmailRefreshToken) {
      return { success: false, error: "Gmail not connected" };
    }

    // Fetch emails from Gmail
    console.log("[IMPORT] ==================== STARTING IMPORT ====================");
    console.log(`[IMPORT] Options: afterDate=${options?.afterDate?.toISOString() || "none"}, maxResults=${options?.maxResults || 100}`);

    const emails = await fetchMyInvestorEmails(settings.gmailRefreshToken, {
      afterDate: options?.afterDate,
      maxResults: options?.maxResults || 100,
    });

    console.log(`[IMPORT] Fetched ${emails.length} emails from Gmail`);

    // Parse emails
    console.log(`[IMPORT] Starting email parsing...`);
    const parsedEmails = parseMyInvestorEmails(emails);

    // Log summary of parsed emails
    const transfers = parsedEmails.filter(e => e.emailType === "FUND_TRANSFER");
    console.log(`[IMPORT] ==================== PARSING SUMMARY ====================`);
    console.log(`[IMPORT] Total parsed: ${parsedEmails.length}`);
    console.log(`[IMPORT] Skipped: ${parsedEmails.filter(e => e.shouldSkip).length}`);
    console.log(`[IMPORT] Transfers (FUND_TRANSFER): ${transfers.length}`);

    // Log all transfers with their details
    console.log(`[IMPORT] ==================== TRANSFER DETAILS ====================`);
    transfers.forEach((t, i) => {
      console.log(`[IMPORT] Transfer ${i + 1}:`);
      console.log(`[IMPORT]   Email ID: ${t.emailId}`);
      console.log(`[IMPORT]   Subject: ${t.subject}`);
      console.log(`[IMPORT]   Transactions: ${t.transactions.length}`);
      t.transactions.forEach((tx, j) => {
        console.log(`[IMPORT]     Tx ${j + 1}: ${tx.transferType} | ${tx.isin} | ${tx.shares} shares | ${tx.date.toISOString()}`);
      });
      if (t.parseErrors && t.parseErrors.length > 0) {
        console.log(`[IMPORT]   ERRORS: ${t.parseErrors.join(", ")}`);
      }
    });

    // SPECIAL CHECK: Look for the missing transfer (142.41 shares, FR0000447823, around 08/29/2025)
    console.log(`[IMPORT] ==================== MISSING TRANSFER CHECK ====================`);
    const targetIsin = "FR0000447823";
    const targetShares = 142.41;
    const targetDate = new Date(2025, 7, 29); // August 29, 2025

    // Check if we received emails around this date with this ISIN
    const potentialMatches = parsedEmails.filter(e => {
      const emailDate = e.date;
      const dayDiff = Math.abs(emailDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24);
      return dayDiff <= 7; // Within 7 days
    });
    console.log(`[IMPORT] Emails within 7 days of 08/29/2025: ${potentialMatches.length}`);
    potentialMatches.forEach(e => {
      console.log(`[IMPORT]   - ${e.date.toISOString()} | ${e.emailType} | ${e.shouldSkip ? "SKIPPED" : "PARSED"} | ${e.subject.substring(0, 60)}`);
      if (e.rawHtml.includes(targetIsin)) {
        console.log(`[IMPORT]     ⚠️ CONTAINS TARGET ISIN ${targetIsin}!`);
      }
    });

    // Also check all parsed emails for the target ISIN
    const emailsWithTargetIsin = parsedEmails.filter(e => e.rawHtml.includes(targetIsin));
    console.log(`[IMPORT] Emails containing ISIN ${targetIsin}: ${emailsWithTargetIsin.length}`);
    emailsWithTargetIsin.forEach(e => {
      console.log(`[IMPORT]   - ${e.date.toISOString()} | ${e.emailType} | ${e.shouldSkip ? "SKIPPED" : "PARSED"}`);
      console.log(`[IMPORT]     Subject: ${e.subject.substring(0, 80)}`);
      console.log(`[IMPORT]     Transactions: ${e.transactions.length}`);
      e.transactions.forEach(tx => {
        console.log(`[IMPORT]       -> ${tx.transferType || tx.type} | ${tx.isin} | ${tx.shares} shares`);
        if (Math.abs(tx.shares - targetShares) < 0.01) {
          console.log(`[IMPORT]       ✅ SHARES MATCH TARGET (${targetShares})!`);
        }
      });
    });
    console.log(`[IMPORT] ==============================================================`);

    // Get all transactions and check for duplicates
    const existingMessageIds = await db.transaction.findMany({
      where: {
        gmailMessageId: { not: null },
      },
      select: { gmailMessageId: true },
    });
    const existingIds = new Set(
      existingMessageIds.map((t) => t.gmailMessageId).filter(Boolean)
    );

    // Build preview items
    const previewItems: ImportPreviewItem[] = [];
    let duplicateCount = 0;

    for (const parsedEmail of parsedEmails) {
      for (const transaction of parsedEmail.transactions) {
        const isDuplicate = existingIds.has(transaction.emailId);
        if (isDuplicate) duplicateCount++;

        previewItems.push({
          id: `${transaction.emailId}-${previewItems.length}`,
          emailId: transaction.emailId,
          transaction,
          isDuplicate,
          isSelected: !isDuplicate,
        });
      }
    }

    // Create import batch
    const batch = await db.importBatch.create({
      data: {
        source: "GMAIL",
        status: "PREVIEWING",
        gmailQuery: options?.afterDate
          ? `after:${options.afterDate.toISOString().split("T")[0]}`
          : undefined,
        oldestEmailDate: emails.length > 0
          ? new Date(Math.min(...emails.map((e) => e.date.getTime())))
          : null,
        newestEmailDate: emails.length > 0
          ? new Date(Math.max(...emails.map((e) => e.date.getTime())))
          : null,
        totalRows: previewItems.length,
        importedRows: 0,
        skippedRows: parsedEmails.filter((e) => e.shouldSkip).length,
        preview: previewItems as unknown as Prisma.JsonArray,
        errors: parsedEmails
          .filter((e) => e.parseErrors && e.parseErrors.length > 0)
          .map((e) => ({
            emailId: e.emailId,
            subject: e.subject,
            errors: e.parseErrors,
          })) as unknown as Prisma.JsonArray,
      },
    });

    // Build summary
    const summary: ImportBatchSummary = {
      batchId: batch.id,
      totalEmails: emails.length,
      parsedEmails: parsedEmails.filter((e) => !e.shouldSkip).length,
      skippedEmails: parsedEmails.filter((e) => e.shouldSkip).length,
      totalTransactions: previewItems.length,
      duplicateTransactions: duplicateCount,
      validTransactions: previewItems.filter((p) => !p.isDuplicate).length,
      errors: parsedEmails
        .filter((e) => e.parseErrors && e.parseErrors.length > 0)
        .map((e) => ({
          emailId: e.emailId,
          subject: e.subject,
          error: e.parseErrors?.join(", ") || "Unknown error",
        })),
    };

    revalidatePath("/import");
    return { success: true, data: { batchId: batch.id, summary } };
  } catch (error) {
    console.error("Failed to fetch Gmail transactions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch transactions",
    };
  }
}

/**
 * Get preview items for an import batch
 */
export async function getImportPreview(
  batchId: string
): Promise<ActionResult<ImportPreviewItem[]>> {
  try {
    const batch = await db.importBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      return { success: false, error: "Import batch not found" };
    }

    const preview = batch.preview as unknown as ImportPreviewItem[];
    return { success: true, data: preview || [] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get preview",
    };
  }
}

/**
 * Confirm import - creates transactions for selected items
 */
export async function confirmImport(
  batchId: string,
  selectedIds: string[]
): Promise<ActionResult<ImportResult>> {
  try {
    const batch = await db.importBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      return { success: false, error: "Import batch not found" };
    }

    if (batch.status !== "PREVIEWING") {
      return { success: false, error: "Import batch is not in preview state" };
    }

    // Update batch status
    await db.importBatch.update({
      where: { id: batchId },
      data: { status: "IMPORTING" },
    });

    const preview = batch.preview as unknown as ImportPreviewItem[];
    const selectedItems = preview.filter((item) => selectedIds.includes(item.id));

    let importedCount = 0;
    const errors: string[] = [];
    const affectedAssetIds = new Set<string>();

    for (const item of selectedItems) {
      try {
        // Find or create asset
        let asset = await db.asset.findFirst({
          where: { isin: item.transaction.isin },
        });

        if (!asset) {
          asset = await db.asset.create({
            data: {
              isin: item.transaction.isin,
              name: item.transaction.name,
              category: determineAssetCategory(item.transaction.isin, item.transaction.name),
              currency: item.transaction.currency,
            },
          });
        }

        // Track affected assets for holdings recalculation
        affectedAssetIds.add(asset.id);

        // Create transaction
        await db.transaction.create({
          data: {
            assetId: asset.id,
            type: item.transaction.type,
            transferType: item.transaction.transferType,
            date: item.transaction.date,
            shares: new Decimal(item.transaction.shares),
            pricePerShare: item.transaction.pricePerShare
              ? new Decimal(item.transaction.pricePerShare)
              : null,
            totalAmount: new Decimal(item.transaction.totalAmount),
            fees: item.transaction.fees
              ? new Decimal(item.transaction.fees)
              : null,
            gmailMessageId: item.transaction.emailId,
            importBatchId: batchId,
            sourceHash: item.transaction.reference,
          },
        });

        importedCount++;
      } catch (error) {
        errors.push(
          `Failed to import ${item.transaction.name}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    // Recalculate holdings for all affected assets
    for (const assetId of affectedAssetIds) {
      try {
        await recalculateHolding(assetId);
      } catch (error) {
        console.error(`Failed to recalculate holding for ${assetId}:`, error);
      }
    }

    // Update batch with final counts
    await db.importBatch.update({
      where: { id: batchId },
      data: {
        status: errors.length > 0 ? "FAILED" : "COMPLETED",
        importedRows: importedCount,
        skippedRows: preview.length - selectedItems.length,
        errors: errors.length > 0 ? (errors as unknown as Prisma.JsonArray) : Prisma.JsonNull,
      },
    });

    // Update last import date
    await db.settings.update({
      where: { id: "default" },
      data: { lastGmailImport: new Date() },
    });

    revalidatePath("/import");
    revalidatePath("/transactions");
    revalidatePath("/");

    return {
      success: true,
      data: {
        batchId,
        importedCount,
        skippedCount: preview.length - selectedItems.length,
        errors,
      },
    };
  } catch (error) {
    // Mark batch as failed
    await db.importBatch.update({
      where: { id: batchId },
      data: { status: "FAILED" },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to import transactions",
    };
  }
}

/**
 * Cancel an import batch
 */
export async function cancelImport(batchId: string): Promise<ActionResult<void>> {
  try {
    await db.importBatch.delete({
      where: { id: batchId },
    });

    revalidatePath("/import");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel import",
    };
  }
}
