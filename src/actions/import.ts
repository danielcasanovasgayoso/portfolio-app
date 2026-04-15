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
import { recalculateAllHoldings } from "@/services/holdings.service";
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

    // Step 1: Resolve all unique ISINs (including counterparts, for asset creation) to assets upfront
    const primaryIsins = selectedItems.map((item) => item.transaction.isin);
    const counterpartIsins = selectedItems
      .map((item) => item.transaction.counterpartIsin)
      .filter((isin): isin is string => !!isin);
    const uniqueIsins = [...new Set([...primaryIsins, ...counterpartIsins])];
    const existingAssets = await db.asset.findMany({
      where: { userId, isin: { in: uniqueIsins } },
    });
    const isinToAsset = new Map(existingAssets.map((a) => [a.isin, a]));

    // Create missing assets in one pass. For counterpart-only ISINs we don't have
    // a parsed transaction to copy name/category from, so fall back to defaults.
    const missingIsins = uniqueIsins.filter((isin) => !isinToAsset.has(isin));
    for (const isin of missingIsins) {
      const item = selectedItems.find((i) => i.transaction.isin === isin);
      try {
        const asset = await db.asset.create({
          data: {
            userId,
            isin,
            name: item?.transaction.name || isin,
            category: determineAssetCategory(isin, item?.transaction.name || ""),
            currency: item?.transaction.currency || "EUR",
          },
        });
        isinToAsset.set(isin, asset);
      } catch (error) {
        errors.push(
          `Failed to create asset ${isin}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    // Step 2: Create all transactions. Track created transfers so we can pair them.
    interface CreatedTransfer {
      id: string;
      assetId: string;
      counterpartIsin: string | undefined;
      transferType: "IN" | "OUT";
      date: Date;
      shares: Decimal;
      totalAmount: Decimal;
    }
    const createdTransfers: CreatedTransfer[] = [];

    for (const item of selectedItems) {
      const asset = isinToAsset.get(item.transaction.isin);
      if (!asset) continue; // Asset creation failed above

      try {
        const created = await db.transaction.create({
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

        if (
          created.type === "TRANSFER" &&
          (created.transferType === "IN" || created.transferType === "OUT")
        ) {
          createdTransfers.push({
            id: created.id,
            assetId: created.assetId,
            counterpartIsin: item.transaction.counterpartIsin,
            transferType: created.transferType,
            date: created.date,
            shares: created.shares,
            totalAmount: created.totalAmount,
          });
        }

        affectedAssetIds.add(asset.id);
        importedCount++;
      } catch (error) {
        errors.push(
          `Failed to import ${item.transaction.name}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    // Step 3: Pair TRANSFER_OUT / TRANSFER_IN legs.
    // Same day, matching shares (8-decimal tolerance), OUT.assetId == IN.counterpartAssetId and vice versa.
    await pairImportedTransfers(userId, createdTransfers, isinToAsset);

    // Step 4: Recalculate ALL holdings globally so fiscal cost basis flows across paired transfers.
    if (affectedAssetIds.size > 0) {
      try {
        await recalculateAllHoldings(userId);
      } catch (error) {
        console.error(`Failed to recalculate holdings:`, error);
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
 * Pairs TRANSFER_OUT and TRANSFER_IN legs from a just-completed import.
 * Uses same-day + same-shares (8-decimal tolerance) + crossed-ISIN matching,
 * and also considers any existing un-paired transfers the user already has
 * (useful when one leg was imported earlier).
 */
async function pairImportedTransfers(
  userId: string,
  createdTransfers: Array<{
    id: string;
    assetId: string;
    counterpartIsin: string | undefined;
    transferType: "IN" | "OUT";
    date: Date;
    shares: Decimal;
    totalAmount: Decimal;
  }>,
  isinToAsset: Map<string, { id: string; isin: string }>
): Promise<void> {
  if (createdTransfers.length === 0) return;

  const isinByAssetId = new Map<string, string>();
  for (const asset of isinToAsset.values()) {
    isinByAssetId.set(asset.id, asset.isin);
  }
  // Fill missing ISINs via a DB lookup (e.g. for pre-existing counterpart assets).
  const unknownAssetIds = new Set<string>();
  for (const tx of createdTransfers) {
    if (!isinByAssetId.has(tx.assetId)) unknownAssetIds.add(tx.assetId);
  }
  if (unknownAssetIds.size > 0) {
    const rows = await db.asset.findMany({
      where: { id: { in: [...unknownAssetIds] } },
      select: { id: true, isin: true },
    });
    for (const r of rows) isinByAssetId.set(r.id, r.isin);
  }

  const SHARES_TOLERANCE = new Decimal("0.00000001");
  const AMOUNT_TOLERANCE = new Decimal("0.05");
  const DATE_WINDOW_DAYS = 45;
  const claimedIds = new Set<string>();

  for (const outTx of createdTransfers) {
    if (outTx.transferType !== "OUT") continue;
    if (claimedIds.has(outTx.id)) continue;
    if (!outTx.counterpartIsin) continue;
    const destAsset = isinToAsset.get(outTx.counterpartIsin);
    if (!destAsset) continue;

    // 1) Try to pair with a freshly created IN leg.
    let match = createdTransfers.find((cand) => {
      if (cand.transferType !== "IN") return false;
      if (claimedIds.has(cand.id)) return false;
      if (cand.assetId !== destAsset.id) return false;
      const candIsin = isinByAssetId.get(cand.assetId);
      const outAssetIsin = isinByAssetId.get(outTx.assetId);
      // Counterpart-ISIN cross-check.
      if (outTx.counterpartIsin !== candIsin) return false;
      if (cand.counterpartIsin && outAssetIsin && cand.counterpartIsin !== outAssetIsin) {
        return false;
      }
      // Within window
      const dDiffDays = Math.abs(cand.date.getTime() - outTx.date.getTime()) / (1000 * 60 * 60 * 24);
      if (dDiffDays > DATE_WINDOW_DAYS) return false;

      // Same shares (tolerance) OR same amount (tolerance)
      const sharesMatch = cand.shares.minus(outTx.shares).abs().lessThanOrEqualTo(SHARES_TOLERANCE);
      const amountMatch = cand.totalAmount
        ? cand.totalAmount.minus(outTx.totalAmount).abs().lessThanOrEqualTo(AMOUNT_TOLERANCE)
        : false;

      return sharesMatch || amountMatch;
    });

    // 2) If no newly-created leg matched, look for a pre-existing un-paired IN
    //    in the database (partner email imported in a previous batch).
    if (!match) {
      const windowStart = new Date(outTx.date.getTime() - DATE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
      const windowEnd = new Date(outTx.date.getTime() + DATE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

      const existing = await db.transaction.findFirst({
        where: {
          userId,
          type: "TRANSFER",
          transferType: "IN",
          transferPairId: null,
          assetId: destAsset.id,
          date: { gte: windowStart, lte: windowEnd },
          OR: [
            { shares: { gte: outTx.shares.minus(SHARES_TOLERANCE), lte: outTx.shares.plus(SHARES_TOLERANCE) } },
            { totalAmount: { gte: outTx.totalAmount.minus(AMOUNT_TOLERANCE), lte: outTx.totalAmount.plus(AMOUNT_TOLERANCE) } }
          ]
        },
        select: { id: true, assetId: true, date: true, shares: true, totalAmount: true },
      });

      if (existing) {
        match = {
          id: existing.id,
          assetId: existing.assetId,
          counterpartIsin: undefined,
          transferType: "IN",
          date: existing.date,
          shares: existing.shares,
          totalAmount: existing.totalAmount
        };
      }
    }

    if (match) {
      const pairId = crypto.randomUUID();
      await db.$transaction([
        db.transaction.update({
          where: { id: outTx.id },
          data: { transferPairId: pairId },
        }),
        db.transaction.update({
          where: { id: match.id },
          data: { transferPairId: pairId },
        }),
      ]);
      claimedIds.add(outTx.id);
      claimedIds.add(match.id);
    }
  }

  // Second pass: handle INs in createdTransfers whose OUT leg already exists in the DB.
  for (const inTx of createdTransfers) {
    if (inTx.transferType !== "IN") continue;
    if (claimedIds.has(inTx.id)) continue;
    if (!inTx.counterpartIsin) continue;
    const srcAsset = isinToAsset.get(inTx.counterpartIsin);
    if (!srcAsset) continue;

    const windowStart = new Date(inTx.date.getTime() - DATE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(inTx.date.getTime() + DATE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const existing = await db.transaction.findFirst({
      where: {
        userId,
        type: "TRANSFER",
        transferType: "OUT",
        transferPairId: null,
        assetId: srcAsset.id,
        date: { gte: windowStart, lte: windowEnd },
        OR: [
          { shares: { gte: inTx.shares.minus(SHARES_TOLERANCE), lte: inTx.shares.plus(SHARES_TOLERANCE) } },
          { totalAmount: { gte: inTx.totalAmount.minus(AMOUNT_TOLERANCE), lte: inTx.totalAmount.plus(AMOUNT_TOLERANCE) } }
        ]
      },
      select: { id: true },
    });

    if (existing) {
      const pairId = crypto.randomUUID();
      await db.$transaction([
        db.transaction.update({
          where: { id: inTx.id },
          data: { transferPairId: pairId },
        }),
        db.transaction.update({
          where: { id: existing.id },
          data: { transferPairId: pairId },
        }),
      ]);
      claimedIds.add(inTx.id);
      claimedIds.add(existing.id);
    }
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
