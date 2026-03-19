/**
 * Script to add the missing transfer transaction
 * Run with: npx tsx scripts/add-missing-transfer.ts
 */

import { PrismaClient, Decimal } from "@prisma/client";

const prisma = new PrismaClient();

async function addMissingTransfer() {
  console.log("Adding missing transfer transaction...\n");

  // The missing transfer: 08/29/2025, Transfer IN, 142.41 shares to Vanguard Global Stock
  const targetIsin = "IE00B03HD191"; // Vanguard Global Stock EUR
  const sourceIsin = "FR0000447823"; // AXA Tresor (source fund)

  // Find the Vanguard asset
  const vanguardAsset = await prisma.asset.findFirst({
    where: { isin: targetIsin },
  });

  if (!vanguardAsset) {
    console.error(`Asset with ISIN ${targetIsin} not found!`);
    process.exit(1);
  }

  console.log(`Found asset: ${vanguardAsset.name} (${vanguardAsset.isin})`);

  // Check if this transaction already exists (by date + shares + type)
  const existingTx = await prisma.transaction.findFirst({
    where: {
      assetId: vanguardAsset.id,
      type: "TRANSFER",
      transferType: "IN",
      shares: new Decimal(142.41),
      date: {
        gte: new Date(2025, 7, 28), // Aug 28
        lte: new Date(2025, 7, 30), // Aug 30
      },
    },
  });

  if (existingTx) {
    console.log("Transaction already exists! Skipping.");
    console.log(`Existing transaction ID: ${existingTx.id}`);
    process.exit(0);
  }

  // Calculate values (approximate - you may need to adjust based on actual email)
  const shares = 142.41;
  const totalAmount = 7366.57; // Approximate value
  const pricePerShare = totalAmount / shares; // ~51.72

  // Create the transaction
  const newTx = await prisma.transaction.create({
    data: {
      assetId: vanguardAsset.id,
      type: "TRANSFER",
      transferType: "IN",
      date: new Date(2025, 7, 29), // August 29, 2025
      shares: new Decimal(shares),
      pricePerShare: new Decimal(pricePerShare),
      totalAmount: new Decimal(totalAmount),
      fees: new Decimal(0),
      sourceHash: `manual-transfer-${Date.now()}`,
    },
  });

  console.log("\n✅ Transaction created successfully!");
  console.log(`   ID: ${newTx.id}`);
  console.log(`   Date: ${newTx.date.toISOString()}`);
  console.log(`   Type: ${newTx.type} (${newTx.transferType})`);
  console.log(`   Shares: ${newTx.shares}`);
  console.log(`   Price: ${newTx.pricePerShare}`);
  console.log(`   Total: ${newTx.totalAmount}`);

  // Recalculate the holding for this asset
  console.log("\nRecalculating holding...");

  const transactions = await prisma.transaction.findMany({
    where: { assetId: vanguardAsset.id },
    orderBy: { date: "asc" },
  });

  let totalShares = new Decimal(0);
  let totalCost = new Decimal(0);

  for (const tx of transactions) {
    if (tx.type === "BUY" || (tx.type === "TRANSFER" && tx.transferType === "IN")) {
      totalShares = totalShares.plus(tx.shares);
      totalCost = totalCost.plus(tx.totalAmount);
    } else if (tx.type === "SELL" || (tx.type === "TRANSFER" && tx.transferType === "OUT")) {
      totalShares = totalShares.minus(tx.shares);
      totalCost = totalCost.minus(tx.totalAmount);
    }
  }

  const avgPrice = totalShares.gt(0) ? totalCost.div(totalShares) : new Decimal(0);

  await prisma.holding.upsert({
    where: { assetId: vanguardAsset.id },
    create: {
      assetId: vanguardAsset.id,
      shares: totalShares,
      costBasis: totalCost,
      avgPrice,
    },
    update: {
      shares: totalShares,
      costBasis: totalCost,
      avgPrice,
      lastCalculatedAt: new Date(),
    },
  });

  console.log("✅ Holding updated!");
  console.log(`   Total shares: ${totalShares}`);
  console.log(`   Cost basis: ${totalCost}`);
  console.log(`   Avg price: ${avgPrice}`);
}

addMissingTransfer()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
