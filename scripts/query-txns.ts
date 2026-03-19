import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  // Check ALL transfers with 0 shares or small shares (might indicate parsing issue)
  console.log('\n=== All TRANSFER IN with potentially wrong shares ===\n');

  const allTransfersIn = await db.transaction.findMany({
    where: {
      type: 'TRANSFER',
      transferType: 'IN'
    },
    include: { asset: true },
    orderBy: { date: 'asc' }
  });

  console.log('Date       | ISIN         | Shares    | Price     | Amount');
  console.log('-----------|--------------|-----------|-----------|------------');

  allTransfersIn.forEach(t => {
    const date = t.date.toISOString().split('T')[0];
    const isin = t.asset.isin.padEnd(12);
    const shares = Number(t.shares).toFixed(2).padStart(9);
    const price = Number(t.pricePerShare || 0).toFixed(2).padStart(9);
    const amount = Number(t.totalAmount).toFixed(2).padStart(10);
    console.log(`${date} | ${isin} | ${shares} | ${price} | ${amount}`);
  });

  console.log(`\nTotal TRANSFER IN: ${allTransfersIn.length}`);

  // Check all transfers OUT in late August
  console.log('\n=== TRANSFER OUT around Aug 26-29 (source of missing transfer) ===\n');

  const outTransfers = await db.transaction.findMany({
    where: {
      type: 'TRANSFER',
      transferType: 'OUT',
      date: {
        gte: new Date('2025-08-25'),
        lte: new Date('2025-08-30')
      }
    },
    include: { asset: true },
    orderBy: { date: 'asc' }
  });

  outTransfers.forEach(t => {
    console.log(`${t.date.toISOString().split('T')[0]} | ${t.asset.isin} | OUT | shares: ${Number(t.shares).toFixed(2)} | amount: ${Number(t.totalAmount).toFixed(2)}`);
  });

  // Check import batches for any errors
  console.log('\n=== Import batches with errors ===\n');
  const batches = await db.importBatch.findMany({
    where: {
      errors: { not: null }
    }
  });

  batches.forEach(b => {
    console.log(`Batch ${b.id}: ${b.status} - errors: ${JSON.stringify(b.errors)}`);
  });
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
