/**
 * MyInvestor Fund Lookup Service
 *
 * Uses the "Listado de fondos MyInvestor - Fondos.csv" data to provide
 * ISIN lookups for fund name, category, and currency information.
 *
 * CSV Columns (relevant):
 * - 0: ISIN
 * - 1: Nombre (Name)
 * - 3: Fondo / PP (Fund type: "Fondo", "Fondo Indexado", "PP")
 * - 4: Tipo (Type: "Renta Variable", "Mixto", "Materias Primas", etc.)
 * - 9: Divisa (Currency)
 */

import type { AssetCategory } from "@prisma/client";

export interface FundInfo {
  isin: string;
  name: string;
  category: AssetCategory;
  fundType: string; // "Fondo", "Fondo Indexado", "PP"
  assetType: string; // "Renta Variable", "Mixto", etc.
  currency: string;
}

// In-memory cache of fund data
let fundCache: Map<string, FundInfo> | null = null;

/**
 * Parses a CSV line handling quoted fields with commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

/**
 * Maps the "Fondo / PP" column to AssetCategory
 */
function mapFundTypeToCategory(fundType: string): AssetCategory {
  const normalized = fundType.toUpperCase().trim();

  if (normalized === "PP" || normalized.includes("PENSION")) {
    return "PP";
  }

  // "Fondo" and "Fondo Indexado" are both FUNDS
  if (normalized.includes("FONDO")) {
    return "FUNDS";
  }

  return "OTHERS";
}

/**
 * Parses the fund CSV data and returns a lookup map
 */
function parseFundData(csvContent: string): Map<string, FundInfo> {
  const lines = csvContent.split("\n");
  const fundMap = new Map<string, FundInfo>();

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = parseCSVLine(line);

    // Ensure we have enough columns
    if (columns.length < 10) continue;

    const isin = columns[0]?.trim();
    if (!isin || isin.length < 12) continue;

    const fundInfo: FundInfo = {
      isin,
      name: columns[1]?.trim() || "",
      fundType: columns[3]?.trim() || "Fondo",
      assetType: columns[4]?.trim() || "",
      currency: columns[9]?.trim() || "EUR",
      category: mapFundTypeToCategory(columns[3] || ""),
    };

    fundMap.set(isin, fundInfo);
  }

  return fundMap;
}

/**
 * Loads and caches the fund data from the CSV content
 * This should be called once with the CSV content to initialize the cache
 */
export function initializeFundCache(csvContent: string): void {
  fundCache = parseFundData(csvContent);
  console.log(`[FUND-LOOKUP] Initialized cache with ${fundCache.size} funds`);
}

/**
 * Gets fund info by ISIN
 * Returns undefined if not found
 */
export function getFundByIsin(isin: string): FundInfo | undefined {
  if (!fundCache) {
    console.warn("[FUND-LOOKUP] Cache not initialized. Call initializeFundCache first.");
    return undefined;
  }
  return fundCache.get(isin);
}

/**
 * Gets the asset category for an ISIN
 * Returns "OTHERS" if not found
 */
export function getCategoryByIsin(isin: string): AssetCategory {
  const fund = getFundByIsin(isin);
  return fund?.category || "OTHERS";
}

/**
 * Gets the fund name for an ISIN
 * Returns undefined if not found
 */
export function getNameByIsin(isin: string): string | undefined {
  const fund = getFundByIsin(isin);
  return fund?.name;
}

/**
 * Gets the currency for an ISIN
 * Returns "EUR" if not found
 */
export function getCurrencyByIsin(isin: string): string {
  const fund = getFundByIsin(isin);
  return fund?.currency || "EUR";
}

/**
 * Checks if the fund cache is initialized
 */
export function isCacheInitialized(): boolean {
  return fundCache !== null;
}

/**
 * Gets the number of funds in cache
 */
export function getCacheSize(): number {
  return fundCache?.size || 0;
}

/**
 * Clears the fund cache
 */
export function clearFundCache(): void {
  fundCache = null;
}

// Embedded fund data from MyInvestor CSV
// This is extracted from the CSV file to enable category lookup without file I/O
const MYINVESTOR_FUNDS: Array<{
  isin: string;
  name: string;
  fundType: string;
  category: AssetCategory;
  currency: string;
}> = [
  // Pension Plans (PP)
  { isin: "ES0165265002", name: "MyInvestor Indexado Global Stock PP", fundType: "PP", category: "PP", currency: "EUR" },
  { isin: "ES0175105008", name: "MyInvestor Indexado S&P500 PP", fundType: "PP", category: "PP", currency: "EUR" },
  { isin: "ES0175106006", name: "MyInvestor Indexado Bonos PP", fundType: "PP", category: "PP", currency: "EUR" },
  { isin: "ES0171664004", name: "MyInvestor Value PP", fundType: "PP", category: "PP", currency: "EUR" },
  { isin: "ES0125336004", name: "MyInvestor Cartera Permanente PP", fundType: "PP", category: "PP", currency: "EUR" },

  // Popular Funds - Vanguard
  { isin: "IE00B03HD191", name: "Vanguard Global Stock Index Fund EUR Acc", fundType: "Fondo", category: "FUNDS", currency: "EUR" },
  { isin: "IE0031786696", name: "Vanguard Emerging Markets Stock Index Fund EUR Acc", fundType: "Fondo", category: "FUNDS", currency: "EUR" },
  { isin: "IE00B42W4L06", name: "Vanguard Global Small-Cap Index Fund EUR Acc", fundType: "Fondo", category: "FUNDS", currency: "EUR" },
  { isin: "IE00B18GC888", name: "Vanguard Eurozone Stock Index Fund EUR Acc", fundType: "Fondo", category: "FUNDS", currency: "EUR" },
  { isin: "IE00BG47KH54", name: "Vanguard 2020 Target Retirement Fund EUR", fundType: "Fondo", category: "FUNDS", currency: "EUR" },

  // Popular Funds - iShares/BlackRock
  { isin: "IE000QAZP7L2", name: "iShares Emerging Markets Index Fund (IE) Acc EUR", fundType: "Fondo", category: "FUNDS", currency: "EUR" },
  { isin: "IE00BFMXXD54", name: "iShares Global Aggregate Bond Index Fund", fundType: "Fondo", category: "FUNDS", currency: "EUR" },

  // Gold & Precious Metals Funds
  { isin: "LU0273159177", name: "DWS Invest Gold and Precious Metals Equities LC", fundType: "Fondo", category: "FUNDS", currency: "EUR" },
  { isin: "LU0171305526", name: "BlackRock Global Funds - World Gold Fund A2 EUR Acc", fundType: "Fondo", category: "FUNDS", currency: "EUR" },
  { isin: "LU1223083087", name: "Schroder International Selection Fund Global Gold A Acc EUR Hedged", fundType: "Fondo", category: "FUNDS", currency: "EUR" },
  { isin: "IE00BYVJR916", name: "Jupiter Gold & Silver Fund", fundType: "Fondo", category: "FUNDS", currency: "EUR" },
  { isin: "LU0503253931", name: "Invesco Gold & Precious Metals", fundType: "Fondo", category: "FUNDS", currency: "EUR" },

  // Technology Funds
  { isin: "LU1861217088", name: "BlackRock Global Funds - FinTech Fund A2", fundType: "Fondo", category: "FUNDS", currency: "USD" },
  { isin: "LU2466448532", name: "Echiquier Space B", fundType: "Fondo", category: "FUNDS", currency: "EUR" },

  // Regional Funds - Spain
  { isin: "ES0159201013", name: "Magallanes Iberian Equity M FI", fundType: "Fondo", category: "FUNDS", currency: "EUR" },
  { isin: "ES0167211038", name: "Okavango Delta A FI", fundType: "Fondo", category: "FUNDS", currency: "EUR" },
  { isin: "ES0162735031", name: "Metavalor FI", fundType: "Fondo", category: "FUNDS", currency: "EUR" },
  { isin: "ES0165144009", name: "MUTUAFONDO ESPAÑA A FI", fundType: "Fondo", category: "FUNDS", currency: "EUR" },
  { isin: "ES0175224031", name: "SANTANDER SMALL CAPS ESPAÑA FI", fundType: "Fondo", category: "FUNDS", currency: "EUR" },

  // Morgan Stanley Funds
  { isin: "LU0073232471", name: "Morgan Stanley Investment Funds - US Growth Fund A", fundType: "Fondo", category: "FUNDS", currency: "USD" },
  { isin: "LU0266117414", name: "Morgan Stanley Investment Funds - US Growth Fund AH (EUR)", fundType: "Fondo", category: "FUNDS", currency: "EUR" },
  { isin: "LU0225737302", name: "Morgan Stanley Investment Funds - US Advantage Fund A", fundType: "Fondo", category: "FUNDS", currency: "USD" },
  { isin: "LU0552385618", name: "Morgan Stanley Investment Funds - Global Opportunity Fund AH (EUR)", fundType: "Fondo", category: "FUNDS", currency: "EUR" },
  { isin: "LU0868753731", name: "Morgan Stanley Investment Funds - Global Insight Fund A", fundType: "Fondo", category: "FUNDS", currency: "USD" },

  // Amundi Index Funds
  { isin: "FR0000447823", name: "Amundi MSCI World UCITS ETF", fundType: "Fondo", category: "FUNDS", currency: "EUR" },
  { isin: "FR0000989626", name: "Amundi Funds Index Solutions", fundType: "Fondo", category: "FUNDS", currency: "EUR" },
  { isin: "FR0013346079", name: "Amundi Funds", fundType: "Fondo", category: "FUNDS", currency: "EUR" },

  // European Funds
  { isin: "LU0235308482", name: "Alken European Opportunities R", fundType: "Fondo", category: "FUNDS", currency: "EUR" },
  { isin: "LU0524465548", name: "ALKEN FUND SMALL CAP EUROPE A", fundType: "Fondo", category: "FUNDS", currency: "EUR" },
  { isin: "LU1832174962", name: "Indépendance et Expansion SICAV - Europe Small A (C)", fundType: "Fondo", category: "FUNDS", currency: "EUR" },

  // Commodities
  { isin: "FR0011170182", name: "Ofi Financial Investment - Precious Metals R", fundType: "Fondo", category: "FUNDS", currency: "EUR" },

  // Fixed Income
  { isin: "IE00BYZ28V50", name: "iShares Global Government Bond Index Fund", fundType: "Fondo", category: "FUNDS", currency: "EUR" },

  // MyInvestor Cartera Funds (Robo-advisor portfolios)
  { isin: "ES0156572002", name: "MyInvestor Cartera Permanente FI", fundType: "Fondo", category: "FUNDS", currency: "EUR" },
  { isin: "ES0179551016", name: "MyInvestor Value FI", fundType: "Fondo", category: "FUNDS", currency: "EUR" },
];

// Build static lookup map
const STATIC_FUND_MAP = new Map<string, FundInfo>(
  MYINVESTOR_FUNDS.map((f) => [
    f.isin,
    {
      isin: f.isin,
      name: f.name,
      fundType: f.fundType,
      category: f.category,
      currency: f.currency,
      assetType: "",
    },
  ])
);

/**
 * Gets fund info from the static embedded data
 * This is available immediately without needing to load the CSV
 */
export function getStaticFundByIsin(isin: string): FundInfo | undefined {
  return STATIC_FUND_MAP.get(isin);
}

/**
 * Gets category from static data, falling back to heuristics
 */
export function getStaticCategoryByIsin(isin: string, name?: string): AssetCategory {
  // First try static lookup
  const fund = STATIC_FUND_MAP.get(isin);
  if (fund) {
    return fund.category;
  }

  // Fall back to heuristics based on ISIN prefix and name
  const upperName = (name || "").toUpperCase();

  // Spanish ISIN prefix typically indicates PP or local fund
  if (isin.startsWith("ES")) {
    if (upperName.includes(" PP") || upperName.includes("PENSION") || upperName.includes("PLAN DE PENSIONES")) {
      return "PP";
    }
    return "FUNDS";
  }

  // European fund ISINs (Ireland, Luxembourg, France, etc.)
  if (isin.startsWith("IE") || isin.startsWith("LU") || isin.startsWith("FR") || isin.startsWith("NL")) {
    return "FUNDS";
  }

  // Check name for stock/ETF indicators
  if (upperName.includes("ETF") || upperName.includes("ETC") || upperName.includes("PHYSICAL")) {
    return "STOCKS";
  }

  return "OTHERS";
}

/**
 * Determines asset category based on ISIN and optional name
 * Uses static lookup first, then dynamic cache, then heuristics
 */
export function determineAssetCategory(isin: string, name?: string): AssetCategory {
  // Try static lookup first
  const staticFund = STATIC_FUND_MAP.get(isin);
  if (staticFund) {
    return staticFund.category;
  }

  // Try dynamic cache if available
  if (fundCache) {
    const cachedFund = fundCache.get(isin);
    if (cachedFund) {
      return cachedFund.category;
    }
  }

  // Fall back to heuristics
  return getStaticCategoryByIsin(isin, name);
}

/**
 * Gets fund name from all available sources
 */
export function determineFundName(isin: string, fallbackName?: string): string {
  // Try static lookup first
  const staticFund = STATIC_FUND_MAP.get(isin);
  if (staticFund) {
    return staticFund.name;
  }

  // Try dynamic cache if available
  if (fundCache) {
    const cachedFund = fundCache.get(isin);
    if (cachedFund) {
      return cachedFund.name;
    }
  }

  // Return fallback or ISIN
  return fallbackName || isin;
}
