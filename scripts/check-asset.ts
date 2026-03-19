import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const asset = await db.asset.findFirst({
    where: { isin: "IE00B03HD191" },
    include: {
      transactions: {
        orderBy: { date: "asc" },
      },
      holding: true,
    },
  });

  if (!asset) {
    console.log("Asset not found");
    return;
  }

  console.log("Asset:", asset.name);
  console.log("\nTransactions:");

  let totalShares = 0;
  for (const t of asset.transactions) {
    const shares = Number(t.shares);
    const isOut =
      t.type === "SELL" || (t.type === "TRANSFER" && t.transferType === "OUT");
    const delta = isOut ? -shares : shares;
    totalShares += delta;
    console.log(
      t.date.toISOString().split("T")[0],
      t.type.padEnd(8),
      (t.transferType || "-").padEnd(4),
      shares.toFixed(4).padStart(10),
      "Running:",
      totalShares.toFixed(4).padStart(10)
    );
  }

  console.log("\nTotal calculated:", totalShares.toFixed(4));

  if (asset.holding) {
    console.log("Holding shares:", Number(asset.holding.shares).toFixed(4));
    console.log("Holding costBasis:", Number(asset.holding.costBasis).toFixed(2));
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
