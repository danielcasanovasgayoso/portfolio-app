-- Three-domain redesign: Wallet (cash) / Investments / Real estate.
--
-- 1. Cash stops being a "manual asset" inside investments: a new CashMovement
--    table becomes the single source of truth for cash. Existing transactions
--    of OTHERS-category assets are converted into cash movements, then those
--    assets are removed from the investments domain.
-- 2. TransactionType flattens TRANSFER + transferType into TRANSFER_IN /
--    TRANSFER_OUT and the discriminator column is dropped.
-- 3. AssetCategory (FUNDS, STOCKS, PP, OTHERS) becomes AssetClass
--    (FUND, ETF, STOCK, PENSION). Former STOCKS rows default to STOCK and can
--    be reclassified as ETF from the UI.

-- ─────────────────────────────────────────────────────────────
-- 1. Wallet domain
-- ─────────────────────────────────────────────────────────────

CREATE TYPE "CashMovementType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

CREATE TABLE "CashMovement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CashMovement_userId_idx" ON "CashMovement"("userId");
CREATE INDEX "CashMovement_userId_date_idx" ON "CashMovement"("userId", "date");

-- Convert transactions of cash-like (OTHERS) assets into cash movements.
-- Inflows (BUY / TRANSFER IN / DIVIDEND) become deposits; outflows
-- (SELL / TRANSFER OUT / FEE) become withdrawals. The asset name is kept as
-- the movement note so the origin stays readable.
INSERT INTO "CashMovement" ("id", "userId", "type", "date", "amount", "note", "createdAt", "updatedAt")
SELECT
    t."id",
    t."userId",
    CASE
        WHEN t."type" = 'SELL' OR t."type" = 'FEE'
             OR (t."type" = 'TRANSFER' AND t."transferType" = 'OUT')
            THEN 'WITHDRAWAL'::"CashMovementType"
        ELSE 'DEPOSIT'::"CashMovementType"
    END,
    t."date",
    ABS(t."totalAmount"),
    a."name",
    t."createdAt",
    t."updatedAt"
FROM "Transaction" t
JOIN "Asset" a ON a."id" = t."assetId"
WHERE a."category" = 'OTHERS';

-- Remove cash assets from the investments domain (transactions, holdings and
-- prices cascade via FK).
DELETE FROM "Asset" WHERE "category" = 'OTHERS';

-- ─────────────────────────────────────────────────────────────
-- 2. Flatten TransactionType (TRANSFER → TRANSFER_IN / TRANSFER_OUT)
-- ─────────────────────────────────────────────────────────────

CREATE TYPE "TransactionType_new" AS ENUM ('BUY', 'SELL', 'TRANSFER_IN', 'TRANSFER_OUT', 'DIVIDEND', 'FEE');

ALTER TABLE "Transaction"
    ALTER COLUMN "type" TYPE "TransactionType_new"
    USING (
        CASE
            WHEN "type" = 'TRANSFER' AND "transferType" = 'OUT' THEN 'TRANSFER_OUT'
            WHEN "type" = 'TRANSFER' THEN 'TRANSFER_IN'
            ELSE "type"::TEXT
        END
    )::"TransactionType_new";

DROP TYPE "TransactionType";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";

ALTER TABLE "Transaction" DROP COLUMN "transferType";
DROP TYPE "TransferType";

-- ─────────────────────────────────────────────────────────────
-- 3. AssetCategory → AssetClass
-- ─────────────────────────────────────────────────────────────

CREATE TYPE "AssetClass" AS ENUM ('FUND', 'ETF', 'STOCK', 'PENSION');

ALTER TABLE "Asset" ALTER COLUMN "category" DROP DEFAULT;

ALTER TABLE "Asset"
    ALTER COLUMN "category" TYPE "AssetClass"
    USING (
        CASE "category"::TEXT
            WHEN 'FUNDS' THEN 'FUND'
            WHEN 'STOCKS' THEN 'STOCK'
            WHEN 'PP' THEN 'PENSION'
            ELSE 'STOCK'
        END
    )::"AssetClass";

ALTER TABLE "Asset" ALTER COLUMN "category" SET DEFAULT 'FUND';

ALTER TABLE "TickerMapping"
    ALTER COLUMN "category" TYPE "AssetClass"
    USING (
        CASE "category"::TEXT
            WHEN 'FUNDS' THEN 'FUND'
            WHEN 'STOCKS' THEN 'STOCK'
            WHEN 'PP' THEN 'PENSION'
            ELSE 'STOCK'
        END
    )::"AssetClass";

DROP TYPE "AssetCategory";
