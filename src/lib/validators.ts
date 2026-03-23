import { z } from "zod";

// Transaction types enum
export const TransactionTypeEnum = z.enum([
  "BUY",
  "SELL",
  "DIVIDEND",
  "FEE",
  "TRANSFER",
]);

export const TransferTypeEnum = z.enum(["IN", "OUT"]);

// Decimal string validator (accepts numbers or numeric strings)
const decimalString = z
  .string()
  .regex(/^-?\d*\.?\d+$/, "Must be a valid number");

export const AssetCategoryEnum = z.enum(["FUNDS", "STOCKS", "PP", "OTHERS"]);

// Base transaction schema (without refinements)
const TransactionBaseSchema = z.object({
  assetId: z.string().min(1, "Asset is required"),
  type: TransactionTypeEnum,
  date: z.date(),
  shares: decimalString,
  pricePerShare: decimalString.optional().or(z.literal("")),
  totalAmount: decimalString,
  fees: decimalString.optional().or(z.literal("")),
  transferType: TransferTypeEnum.optional(),
  // New asset fields (when assetId === "__new__")
  newAssetName: z.string().optional(),
  newAssetCategory: AssetCategoryEnum.optional(),
});

// Transfer type refinement
const transferTypeRefinement = (data: { type?: string; transferType?: string }) => {
  if (data.type === "TRANSFER" && !data.transferType) {
    return false;
  }
  return true;
};

// New asset name required when assetId is "__new__"
const newAssetRefinement = (data: { assetId?: string; newAssetName?: string }) => {
  if (data.assetId === "__new__" && (!data.newAssetName || data.newAssetName.trim() === "")) {
    return false;
  }
  return true;
};

// Create transaction schema with refinements
export const TransactionCreateSchema = TransactionBaseSchema
  .refine(transferTypeRefinement, {
    message: "Transfer type is required for transfers",
    path: ["transferType"],
  })
  .refine(newAssetRefinement, {
    message: "Asset name is required when creating a new asset",
    path: ["newAssetName"],
  });

export type TransactionCreateInput = z.infer<typeof TransactionCreateSchema>;

// Update transaction schema (partial, then refined)
export const TransactionUpdateSchema = TransactionBaseSchema.partial().refine(
  transferTypeRefinement,
  {
    message: "Transfer type is required for transfers",
    path: ["transferType"],
  }
);

export type TransactionUpdateInput = z.infer<typeof TransactionUpdateSchema>;

// Transaction filters schema
export const TransactionFiltersSchema = z.object({
  types: z.array(TransactionTypeEnum).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  assetId: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(100).default(20),
});

export type TransactionFiltersInput = z.infer<typeof TransactionFiltersSchema>;
