import { PrismaClient, AssetCategory } from "@prisma/client";

const prisma = new PrismaClient();

// Ticker mappings from Code.js
const TICKER_MAPPINGS: Array<{
  isin: string;
  ticker: string;
  displayName: string;
  category: AssetCategory;
}> = [
  // FUNDS (European Funds ending in .EUFUND)
  {
    isin: "IE00B03HD191",
    ticker: "IE00B03HD191.EUFUND",
    displayName: "Vanguard Global Stock Index Fund EUR Acc",
    category: "FUNDS",
  },
  {
    isin: "FR0000447823",
    ticker: "FR0000447823.EUFUND",
    displayName: "Amundi MSCI World (traspasado)",
    category: "FUNDS",
  },
  {
    isin: "FR0000989626",
    ticker: "FR0000989626.EUFUND",
    displayName: "Amundi Funds (traspasado)",
    category: "FUNDS",
  },
  {
    isin: "FR0013346079",
    ticker: "FR0013346079.EUFUND",
    displayName: "Amundi Funds intermedio (traspasado)",
    category: "FUNDS",
  },
  {
    isin: "IE0031786696",
    ticker: "IE0031786696.EUFUND",
    displayName: "Vanguard Emerging Markets Stock Index Fund EUR Acc",
    category: "FUNDS",
  },
  {
    isin: "IE00B42W4L06",
    ticker: "IE00B42W4L06.EUFUND",
    displayName: "Vanguard Global Small-Cap Index Fund EUR Acc",
    category: "FUNDS",
  },
  {
    isin: "IE000QAZP7L2",
    ticker: "IE000QAZP7L2.EUFUND",
    displayName: "iShares Emerging Markets Index Fund (IE) Acc EUR clase S",
    category: "FUNDS",
  },

  // STOCKS & ETFs (European Exchanges)
  {
    isin: "IE00B579F325",
    ticker: "SGLD.AS",
    displayName: "Invesco Physical Gold ETC",
    category: "STOCKS",
  },

  // PENSION PLANS (PP)
  {
    isin: "ES0165265002",
    ticker: "0P0001LIG7.MC",
    displayName: "MyInvestor Indexado Global Stock PP",
    category: "PP",
  },

  // OTHERS
  {
    isin: "CASH",
    ticker: "CASH",
    displayName: "Cash",
    category: "OTHERS",
  },
];

async function main() {
  console.log("Starting seed...");

  // Clear existing ticker mappings (global data)
  await prisma.tickerMapping.deleteMany();

  // Seed ticker mappings (these are global, shared across all users)
  console.log("Seeding ticker mappings...");
  for (const mapping of TICKER_MAPPINGS) {
    await prisma.tickerMapping.create({
      data: mapping,
    });
    console.log(`  Created: ${mapping.displayName}`);
  }

  // Note: Settings are now per-user and created when a user registers
  // No default settings are seeded

  console.log("Seed completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
