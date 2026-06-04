-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM ('FUNDS', 'STOCKS', 'PP', 'OTHERS');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('BUY', 'SELL', 'DIVIDEND', 'FEE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "PriceSource" AS ENUM ('EODHD', 'MANUAL');

-- CreateEnum
CREATE TYPE "ImportSource" AS ENUM ('GMAIL', 'MANUAL');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PREVIEWING', 'IMPORTING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MortgageType" AS ENUM ('FIXED', 'VARIABLE');

-- CreateEnum
CREATE TYPE "AmortizationMode" AS ENUM ('REDUCE_TERM', 'REDUCE_INSTALLMENT');

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isin" TEXT NOT NULL,
    "ticker" TEXT,
    "name" TEXT NOT NULL,
    "category" "AssetCategory" NOT NULL DEFAULT 'OTHERS',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "manualPricing" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "shares" DECIMAL(18,8) NOT NULL,
    "pricePerShare" DECIMAL(18,8),
    "totalAmount" DECIMAL(18,4) NOT NULL,
    "fees" DECIMAL(18,4) DEFAULT 0,
    "transferType" "TransferType",
    "importBatchId" TEXT,
    "sourceHash" TEXT,
    "gmailMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "shares" DECIMAL(18,8) NOT NULL,
    "costBasis" DECIMAL(18,4) NOT NULL,
    "avgPrice" DECIMAL(18,8) NOT NULL,
    "marketValue" DECIMAL(18,4),
    "unrealizedGain" DECIMAL(18,4),
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Holding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Price" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "open" DECIMAL(18,8),
    "high" DECIMAL(18,8),
    "low" DECIMAL(18,8),
    "close" DECIMAL(18,8) NOT NULL,
    "volume" BIGINT,
    "source" "PriceSource" NOT NULL DEFAULT 'EODHD',

    CONSTRAINT "Price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceCache" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "latestPrice" DECIMAL(18,8) NOT NULL,
    "priceDate" DATE NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "ImportSource" NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "gmailQuery" TEXT,
    "oldestEmailDate" TIMESTAMP(3),
    "newestEmailDate" TIMESTAMP(3),
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "preview" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eodhdApiKey" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "priceUpdateEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priceCacheDurationMin" INTEGER NOT NULL DEFAULT 60,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "locale" TEXT NOT NULL DEFAULT 'es-ES',
    "gmailConnected" BOOLEAN NOT NULL DEFAULT false,
    "gmailRefreshToken" TEXT,
    "lastGmailImport" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "purchasePrice" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "vatRate" DECIMAL(9,6) NOT NULL DEFAULT 0.10,
    "transferTaxRate" DECIMAL(9,6) NOT NULL DEFAULT 0.015,
    "purchaseCosts" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyOwner" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sharePct" DECIMAL(9,4) NOT NULL,
    "isSelf" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyValuation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyValuation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mortgage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "loanAmount" DECIMAL(18,4) NOT NULL,
    "downPayment" DECIMAL(18,4) NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "annualInterestRate" DECIMAL(9,6) NOT NULL,
    "type" "MortgageType" NOT NULL DEFAULT 'FIXED',
    "startDate" TIMESTAMP(3) NOT NULL,
    "initialInterestAmount" DECIMAL(18,4),
    "initialInterestDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mortgage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartialAmortization" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mortgageId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "mode" "AmortizationMode" NOT NULL DEFAULT 'REDUCE_TERM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartialAmortization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TickerMapping" (
    "id" TEXT NOT NULL,
    "isin" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" "AssetCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TickerMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Asset_userId_idx" ON "Asset"("userId");

-- CreateIndex
CREATE INDEX "Asset_category_idx" ON "Asset"("category");

-- CreateIndex
CREATE INDEX "Asset_isActive_idx" ON "Asset"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_userId_isin_key" ON "Asset"("userId", "isin");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_userId_ticker_key" ON "Asset"("userId", "ticker");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_assetId_idx" ON "Transaction"("assetId");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_importBatchId_idx" ON "Transaction"("importBatchId");

-- CreateIndex
CREATE INDEX "Transaction_assetId_date_idx" ON "Transaction"("assetId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_userId_gmailMessageId_key" ON "Transaction"("userId", "gmailMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "Holding_assetId_key" ON "Holding"("assetId");

-- CreateIndex
CREATE INDEX "Holding_userId_idx" ON "Holding"("userId");

-- CreateIndex
CREATE INDEX "Holding_shares_idx" ON "Holding"("shares");

-- CreateIndex
CREATE INDEX "Price_date_idx" ON "Price"("date");

-- CreateIndex
CREATE INDEX "Price_assetId_date_idx" ON "Price"("assetId", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Price_assetId_date_key" ON "Price"("assetId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PriceCache_ticker_key" ON "PriceCache"("ticker");

-- CreateIndex
CREATE INDEX "PriceCache_expiresAt_idx" ON "PriceCache"("expiresAt");

-- CreateIndex
CREATE INDEX "ImportBatch_userId_idx" ON "ImportBatch"("userId");

-- CreateIndex
CREATE INDEX "ImportBatch_status_idx" ON "ImportBatch"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");

-- CreateIndex
CREATE INDEX "Property_userId_idx" ON "Property"("userId");

-- CreateIndex
CREATE INDEX "PropertyOwner_userId_idx" ON "PropertyOwner"("userId");

-- CreateIndex
CREATE INDEX "PropertyOwner_propertyId_idx" ON "PropertyOwner"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyValuation_userId_idx" ON "PropertyValuation"("userId");

-- CreateIndex
CREATE INDEX "PropertyValuation_propertyId_idx" ON "PropertyValuation"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyValuation_propertyId_date_key" ON "PropertyValuation"("propertyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Mortgage_propertyId_key" ON "Mortgage"("propertyId");

-- CreateIndex
CREATE INDEX "Mortgage_userId_idx" ON "Mortgage"("userId");

-- CreateIndex
CREATE INDEX "PartialAmortization_userId_idx" ON "PartialAmortization"("userId");

-- CreateIndex
CREATE INDEX "PartialAmortization_mortgageId_idx" ON "PartialAmortization"("mortgageId");

-- CreateIndex
CREATE UNIQUE INDEX "TickerMapping_isin_key" ON "TickerMapping"("isin");

-- CreateIndex
CREATE INDEX "TickerMapping_ticker_idx" ON "TickerMapping"("ticker");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holding" ADD CONSTRAINT "Holding_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyOwner" ADD CONSTRAINT "PropertyOwner_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyValuation" ADD CONSTRAINT "PropertyValuation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mortgage" ADD CONSTRAINT "Mortgage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartialAmortization" ADD CONSTRAINT "PartialAmortization_mortgageId_fkey" FOREIGN KEY ("mortgageId") REFERENCES "Mortgage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

