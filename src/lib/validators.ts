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

// Decimal string validator (accepts numbers or numeric strings, allows comma as decimal separator)
const decimalString = z
  .string()
  .transform((val) => val.replace(",", "."))
  .pipe(z.string().regex(/^-?\d*\.?\d+$/, "Must be a valid number"));

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
  newAssetIsin: z.string().optional(),
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

// ---------------------------------------------------------------------------
// Real Estate
// ---------------------------------------------------------------------------

export const MortgageTypeEnum = z.enum(["FIXED", "VARIABLE"]);
export const AmortizationModeEnum = z.enum(["REDUCE_TERM", "REDUCE_INSTALLMENT"]);

export const PropertyOwnerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sharePct: z.coerce.number().min(0).max(100),
  isSelf: z.coerce.boolean().default(false),
});

// Rates are stored as fractions (e.g. 0.10 for 10%).
export const PropertyInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  purchaseDate: z.coerce.date(),
  currency: z.string().default("EUR"),
  purchasePrice: z.coerce.number().nonnegative(),
  vatRate: z.coerce.number().min(0).max(1),
  transferTaxRate: z.coerce.number().min(0).max(1),
  purchaseCosts: z.coerce.number().nonnegative(),
  owners: z.array(PropertyOwnerSchema).default([]),
});

export type PropertyInput = z.infer<typeof PropertyInputSchema>;

export const MortgageInputSchema = z
  .object({
    loanAmount: z.coerce.number().positive(),
    downPayment: z.coerce.number().nonnegative(),
    termMonths: z.coerce.number().int().positive(),
    annualInterestRate: z.coerce.number().min(0).max(1),
    type: MortgageTypeEnum.default("FIXED"),
    startDate: z.coerce.date(),
    // Optional interest-only first payment (broken first period).
    initialInterestAmount: z.coerce.number().nonnegative().optional(),
    initialInterestDate: z.coerce.date().optional(),
  })
  .refine(
    (d) => !!d.initialInterestAmount === !!d.initialInterestDate,
    {
      message:
        "Interest-only first payment needs both an amount and a date",
      path: ["initialInterestAmount"],
    }
  );

export type MortgageInputForm = z.infer<typeof MortgageInputSchema>;

export const ValuationInputSchema = z.object({
  date: z.coerce.date(),
  value: z.coerce.number().nonnegative(),
  note: z.string().optional(),
});

export const PartialAmortizationInputSchema = z.object({
  date: z.coerce.date(),
  amount: z.coerce.number().positive(),
  mode: AmortizationModeEnum.default("REDUCE_TERM"),
});

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
