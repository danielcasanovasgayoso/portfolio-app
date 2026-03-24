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
}

/**
 * Gets fund info by ISIN
 * Returns undefined if not found
 */
export function getFundByIsin(isin: string): FundInfo | undefined {
  if (!fundCache) {
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

// DGSFP registry code → ISIN mapping for pension plans
// Código DGSFP: "N" + 4 digits, assigned by Dirección General de Seguros y Fondos de Pensiones
const DGSFP_TO_ISIN: Record<string, string> = {
  N5396: "ES0165265002", // MyInvestor Indexado Global Stock PP
  N5394: "ES0175105008", // MyInvestor Indexado S&P500 PP
  N5459: "ES0125336004", // MyInvestor Cartera Permanente PP
  N5572: "ES0171664004", // MyInvestor Value PP
};

/**
 * Resolves a DGSFP registry code (e.g. "N5396") to an ISIN
 */
export function resolveIsinFromDgsfp(code: string): string | null {
  return DGSFP_TO_ISIN[code.toUpperCase()] ?? null;
}

/**
 * Determines asset category based on ISIN and optional name
 * Uses dynamic cache first, then heuristics based on ISIN prefix and name
 */
export function determineAssetCategory(isin: string, name?: string): AssetCategory {
  // Try dynamic cache if available
  if (fundCache) {
    const cachedFund = fundCache.get(isin);
    if (cachedFund) {
      return cachedFund.category;
    }
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
