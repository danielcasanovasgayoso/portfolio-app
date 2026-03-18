import type { PortfolioSummary, Holding } from "@/types/portfolio";

// Mock data based on the original Code.js ticker mappings
const mockHoldings: Holding[] = [
  // FUNDS
  {
    id: "1",
    name: "Vanguard Global Stock Index Fund EUR Acc",
    isin: "IE00B03HD191",
    ticker: "IE00B03HD191.EUFUND",
    category: "FUNDS",
    shares: 125.4532,
    costBasis: 45000,
    avgPrice: 358.68,
    currentPrice: 385.24,
    priceDate: "2026-03-17",
    marketValue: 48330.15,
    gainLoss: 3330.15,
    gainLossPercent: 0.074,
  },
  {
    id: "2",
    name: "Vanguard Emerging Markets Stock Index Fund EUR Acc",
    isin: "IE0031786696",
    ticker: "IE0031786696.EUFUND",
    category: "FUNDS",
    shares: 85.2145,
    costBasis: 12500,
    avgPrice: 146.69,
    currentPrice: 152.33,
    priceDate: "2026-03-17",
    marketValue: 12980.42,
    gainLoss: 480.42,
    gainLossPercent: 0.0384,
  },
  {
    id: "3",
    name: "Vanguard Global Small-Cap Index Fund EUR Acc",
    isin: "IE00B42W4L06",
    ticker: "IE00B42W4L06.EUFUND",
    category: "FUNDS",
    shares: 42.1234,
    costBasis: 8500,
    avgPrice: 201.77,
    currentPrice: 215.89,
    priceDate: "2026-03-17",
    marketValue: 9092.54,
    gainLoss: 592.54,
    gainLossPercent: 0.0697,
  },

  // STOCKS
  {
    id: "4",
    name: "Invesco Physical Gold ETC",
    isin: "IE00B579F325",
    ticker: "SGLD.AS",
    category: "STOCKS",
    shares: 15,
    costBasis: 5850,
    avgPrice: 390.0,
    currentPrice: 419.8,
    priceDate: "2026-03-17",
    marketValue: 6297.0,
    gainLoss: 447.0,
    gainLossPercent: 0.0764,
  },

  // PP (Pension Plans)
  {
    id: "5",
    name: "MyInvestor Indexado Global Stock PP",
    isin: "ES0165265002",
    ticker: "0P0001LIG7.MC",
    category: "PP",
    shares: 52.3456,
    costBasis: 7800,
    avgPrice: 149.0,
    currentPrice: 162.45,
    priceDate: "2026-03-17",
    marketValue: 8504.98,
    gainLoss: 704.98,
    gainLossPercent: 0.0904,
  },

  // OTHERS
  {
    id: "6",
    name: "Cash",
    isin: "CASH",
    ticker: "CASH",
    category: "OTHERS",
    shares: 1,
    costBasis: 2500,
    avgPrice: 2500,
    currentPrice: null,
    priceDate: null,
    marketValue: 2500,
    gainLoss: 0,
    gainLossPercent: 0,
  },
];

function calculateCategoryTotal(holdings: Holding[]) {
  if (holdings.length === 0) return null;

  const costBasis = holdings.reduce((sum, h) => sum + h.costBasis, 0);
  const marketValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const gainLoss = marketValue - costBasis;
  const gainLossPercent = costBasis > 0 ? gainLoss / costBasis : 0;

  return { costBasis, marketValue, gainLoss, gainLossPercent };
}

export function getMockPortfolioData(): PortfolioSummary {
  const funds = mockHoldings.filter((h) => h.category === "FUNDS");
  const stocks = mockHoldings.filter((h) => h.category === "STOCKS");
  const pp = mockHoldings.filter((h) => h.category === "PP");
  const others = mockHoldings.filter((h) => h.category === "OTHERS");

  const fundsTotals = calculateCategoryTotal(funds);
  const stocksTotals = calculateCategoryTotal(stocks);
  const ppTotals = calculateCategoryTotal(pp);
  const othersTotals = calculateCategoryTotal(others);

  // Invested = funds + stocks + pp (not others like cash)
  const investedHoldings = [...funds, ...stocks, ...pp];
  const investedTotals = calculateCategoryTotal(investedHoldings);

  // Grand = all including others
  const grandTotals = calculateCategoryTotal(mockHoldings);

  return {
    holdings: { funds, stocks, pp, others },
    totals: {
      funds: fundsTotals,
      stocks: stocksTotals,
      pp: ppTotals,
      others: othersTotals,
      invested: investedTotals,
      grand: grandTotals,
    },
  };
}

export function getMockHoldingById(id: string): Holding | undefined {
  return mockHoldings.find((h) => h.id === id);
}

export { mockHoldings };
