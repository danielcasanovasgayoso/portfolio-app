import type { TransactionType, TransferType } from "@prisma/client";

/**
 * Email types from MyInvestor notifications
 */
export type EmailType =
  | "FUND_SUBSCRIPTION" // Suscripcion, Compraventa (BUY)
  | "FUND_REDEMPTION" // Reembolso (SELL)
  | "FUND_TRANSFER" // Traspaso (generates 2 transactions: OUT + IN)
  | "INTEREST_SETTLEMENT" // Liquidacion cuenta (DIVIDEND)
  | "PENSION_CONTRIBUTION" // Aportación planes pensiones (BUY)
  | "COMMISSION_CHANGE" // Skip - informational
  | "SEPA_TRANSFER" // Skip - bank transfer
  | "ACCOUNT_CREDIT_DEBIT" // Skip - account movements
  | "UNKNOWN";

/**
 * Raw email data from Gmail API
 */
export interface GmailEmail {
  id: string;
  threadId: string;
  subject: string;
  date: Date;
  body: string; // HTML body
}

/**
 * Parsed transaction from email
 */
export interface ParsedTransaction {
  date: Date;
  type: TransactionType;
  transferType?: TransferType;
  isin: string;
  name: string;
  shares: number;
  pricePerShare: number;
  totalAmount: number;
  fees: number;
  currency: string;
  reference?: string;
  emailId: string;
  emailType: EmailType;
}

/**
 * Result of parsing an email
 */
export interface ParsedEmail {
  emailId: string;
  subject: string;
  date: Date;
  emailType: EmailType;
  transactions: ParsedTransaction[];
  rawHtml: string;
  parseErrors?: string[];
  shouldSkip: boolean;
  skipReason?: string;
}

/**
 * Import preview item
 */
export interface ImportPreviewItem {
  id: string;
  emailId: string;
  transaction: ParsedTransaction;
  isDuplicate: boolean;
  duplicateOf?: string; // Existing transaction ID if duplicate
  isSelected: boolean;
  validationErrors?: string[];
}

/**
 * Import batch summary
 */
export interface ImportBatchSummary {
  batchId: string;
  totalEmails: number;
  parsedEmails: number;
  skippedEmails: number;
  totalTransactions: number;
  duplicateTransactions: number;
  validTransactions: number;
  errors: Array<{
    emailId: string;
    subject: string;
    error: string;
  }>;
}

/**
 * Import result after confirmation
 */
export interface ImportResult {
  batchId: string;
  importedCount: number;
  skippedCount: number;
  errors: string[];
}
