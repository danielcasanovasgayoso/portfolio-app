import type { Asset, Transaction } from "@prisma/client";

export type TransactionType = "BUY" | "SELL" | "DIVIDEND" | "FEE" | "TRANSFER";
export type TransferType = "IN" | "OUT";

export interface TransactionWithAsset extends Transaction {
  asset: Pick<Asset, "id" | "name" | "isin" | "ticker" | "category">;
}

// Serialized version with Decimal converted to number and Date to string (for client components)
export interface SerializedTransaction {
  id: string;
  assetId: string;
  type: TransactionType;
  date: string;
  shares: number;
  pricePerShare: number | null;
  totalAmount: number;
  fees: number | null;
  transferType: TransferType | null;
  importBatchId: string | null;
  sourceHash: string | null;
  gmailMessageId: string | null;
  createdAt: string;
  updatedAt: string;
  asset: Pick<Asset, "id" | "name" | "isin" | "ticker" | "category">;
}

export interface TransactionFilters {
  types?: TransactionType[];
  dateFrom?: Date;
  dateTo?: Date;
  assetId?: string;
}

export interface PaginationParams {
  page: number;
  perPage: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface TransactionFormData {
  assetId: string;
  type: TransactionType;
  date: Date;
  shares: string;
  pricePerShare?: string;
  totalAmount: string;
  fees?: string;
  transferType?: TransferType;
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
