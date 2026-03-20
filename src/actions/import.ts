"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fetchMyInvestorEmails, testGmailConnection } from "@/services/gmail.service";
import { parseMyInvestorEmails } from "@/services/myinvestor-parser.service";
import type { ActionResult } from "@/lib/action-utils";
import type {
  ImportBatchSummary,
  ImportPreviewItem,
  ImportResult,
} from "@/types/import";
import { Decimal } from "@prisma/client/runtime/client";
import { recalculateHolding } from "@/services/holdings.service";
import { determineAssetCategory } from "@/lib/myinvestor-funds";
import { getUserId } from "@/lib/auth";

/**
 * Check if Gmail is connected for the current user
 */
export async function checkGmailConnection(): Promise<
  ActionResult<{ connected: boolean; canFetch: boolean }>
> {
  try {
    const userId = await getUserId();

    const settings = await db.settings.findUnique({
      where: { userId },
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
 * Disconnect Gmail for the current user
 */
export async function disconnectGmail(): Promise<ActionResult<void>> {
  try {
    const userId = await getUserId();

    await db.settings.update({
      where: { userId },
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
    const userId = await getUserId();

    // Get refresh token from settings
    const settings = await db.settings.findUnique({
      where: { userId },
    });

    if (!settings?.gmailRefreshToken) {
      return { success: false, error: "Gmail not connected" };
    }

    // Fetch emails from Gmail
    const emails = await fetchMyInvestorEmails(settings.gmailRefreshToken, {
      afterDate: options?.afterDate,
      maxResults: options?.maxResults || 100,
    });

    // Parse emails
    const parsedEmails = parseMyInvestorEmails(emails);

    // Get user's existing transactions and check for duplicates
    const existingMessageIds = await db.transaction.findMany({
      where: {
        userId,
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
        userId,
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
    const userId = await getUserId();

    const batch = await db.importBatch.findFirst({
      where: { id: batchId, userId },
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
    const userId = await getUserId();

    const batch = await db.importBatch.findFirst({
      where: { id: batchId, userId },
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
        // Find or create asset for this user
        let asset = await db.asset.findFirst({
          where: { userId, isin: item.transaction.isin },
        });

        if (!asset) {
          asset = await db.asset.create({
            data: {
              userId,
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
            userId,
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
        await recalculateHolding(userId, assetId);
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
      where: { userId },
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
    const userId = await getUserId().catch(() => null);
    if (userId) {
      // Mark batch as failed
      await db.importBatch.updateMany({
        where: { id: batchId, userId },
        data: { status: "FAILED" },
      });
    }

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
    const userId = await getUserId();

    // Verify batch belongs to user
    const batch = await db.importBatch.findFirst({
      where: { id: batchId, userId },
    });

    if (!batch) {
      return { success: false, error: "Import batch not found" };
    }

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
