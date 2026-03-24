/**
 * EODHD API Client
 * https://eodhd.com/financial-apis/api-for-historical-data-and-volumes
 */

import { EODHD, HISTORICAL_DATA } from "./constants";
import { PriceServiceError, ConfigurationError } from "./errors";

export interface EODHDPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjusted_close: number;
  volume: number;
}

export interface EODHDRealTimePrice {
  code: string;
  timestamp: number;
  gmtoffset: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  previousClose: number;
  change: number;
  change_p: number;
}

export interface EODHDError {
  error: string;
  message?: string;
}

export interface EODHDIdMappingItem {
  symbol: string;
  isin?: string;
  exchange?: string;
  country?: string;
  type?: string;
}

export interface ResolvedIsin {
  symbol: string;
  name: string | null;
}

export interface EODHDIdMappingResponse {
  data: EODHDIdMappingItem[];
}

export interface EODHDSearchItem {
  Code: string;
  Exchange: string;
  Name: string;
  Type: string;
  Country: string;
  Currency: string;
  ISIN?: string;
  isPrimary?: boolean;
  previousClose?: number;
  previousCloseDate?: string;
}

type EODHDResponse<T> = T | EODHDError;

/**
 * Check if response is an error
 */
function isError<T>(response: EODHDResponse<T>): response is EODHDError {
  return (response as EODHDError).error !== undefined;
}

/**
 * Get API key from settings or environment
 */
function getApiKey(apiKey?: string | null): string {
  // Try provided key first
  if (apiKey) {
    return apiKey;
  }

  // Fall back to environment variable
  const envKey = process.env.EODHD_API_KEY;
  if (envKey) {
    return envKey;
  }

  throw new ConfigurationError("No EODHD API key configured", "eodhdApiKey");
}

/**
 * Make a request to EODHD API with retry logic
 */
async function fetchWithRetry<T>(
  url: string,
  apiKey?: string | null,
  retries: number = EODHD.RETRY_ATTEMPTS
): Promise<T> {
  const key = getApiKey(apiKey);
  const separator = url.includes("?") ? "&" : "?";
  const fullUrl = `${url}${separator}api_token=${key}&fmt=json`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(fullUrl, {
        headers: {
          Accept: "application/json",
        },
        next: { revalidate: EODHD.CACHE_REVALIDATE_SECONDS },
      });

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - wait and retry with exponential backoff
          await delay(1000 * (attempt + 1));
          continue;
        }
        throw new PriceServiceError(
          `EODHD API error: ${response.status} ${response.statusText}`
        );
      }

      const data: EODHDResponse<T> = await response.json();

      if (isError(data)) {
        throw new PriceServiceError(data.message || data.error);
      }

      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries) {
        await delay(EODHD.RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw lastError || new PriceServiceError("EODHD API request failed");
}

/**
 * Utility delay function
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format ticker for EODHD API
 * EODHD uses format: SYMBOL.EXCHANGE
 * e.g., AAPL.US, PHAU.XETRA, etc.
 */
export function formatTicker(ticker: string): string {
  // If already has exchange suffix, return as-is
  if (ticker.includes(".")) {
    return ticker;
  }

  // Default to US exchange for simple tickers
  return `${ticker}.US`;
}

/**
 * Fetch historical prices for a ticker
 */
export async function fetchHistoricalPrices(
  ticker: string,
  options?: {
    from?: Date;
    to?: Date;
    period?: "d" | "w" | "m"; // daily, weekly, monthly
    apiKey?: string | null;
  }
): Promise<EODHDPrice[]> {
  const formattedTicker = formatTicker(ticker);
  let url = `${EODHD.BASE_URL}/eod/${formattedTicker}`;

  const params: string[] = [];

  if (options?.from) {
    params.push(`from=${options.from.toISOString().split("T")[0]}`);
  }

  if (options?.to) {
    params.push(`to=${options.to.toISOString().split("T")[0]}`);
  }

  if (options?.period) {
    params.push(`period=${options.period}`);
  }

  if (params.length > 0) {
    url += `?${params.join("&")}`;
  }

  return fetchWithRetry<EODHDPrice[]>(url, options?.apiKey);
}

/**
 * Fetch real-time price for a single ticker
 */
export async function fetchRealTimePrice(
  ticker: string,
  options?: {
    apiKey?: string | null;
  }
): Promise<EODHDRealTimePrice> {
  const formattedTicker = formatTicker(ticker);
  const url = `${EODHD.BASE_URL}/real-time/${formattedTicker}`;

  return fetchWithRetry<EODHDRealTimePrice>(url, options?.apiKey);
}

/**
 * Batch fetch real-time prices for multiple tickers
 * EODHD allows up to 50 symbols per request
 */
export async function fetchBatchRealTimePrices(
  tickers: string[],
  options?: {
    apiKey?: string | null;
  }
): Promise<Map<string, EODHDRealTimePrice>> {
  const results = new Map<string, EODHDRealTimePrice>();

  // Build a map from code (without exchange) to original ticker
  // e.g., "PHAU" -> "PHAU.XETRA"
  const codeToTicker = new Map<string, string>();
  for (const ticker of tickers) {
    const code = ticker.split(".")[0];
    codeToTicker.set(code, ticker);
  }

  // Process in batches
  const batches = chunk(tickers, EODHD.BATCH_SIZE);

  for (const batch of batches) {
    const formattedTickers = batch.map(formatTicker);
    const symbols = formattedTickers.join(",");
    const url = `${EODHD.BASE_URL}/real-time/${formattedTickers[0]}?s=${symbols}`;

    try {
      const data = await fetchWithRetry<EODHDRealTimePrice | EODHDRealTimePrice[]>(
        url,
        options?.apiKey
      );

      // Single ticker returns object, multiple returns array
      const prices = Array.isArray(data) ? data : [data];

      for (const price of prices) {
        if (price.code) {
          // Map the code back to the original ticker format
          const originalTicker = codeToTicker.get(price.code) || price.code;
          results.set(originalTicker, price);
        }
      }
    } catch (error) {
      console.error(`Failed to fetch batch prices for ${batch.join(", ")}:`, error);
    }

    // Rate limiting: wait between batches
    if (batches.length > 1) {
      await delay(EODHD.RATE_LIMIT_DELAY_MS);
    }
  }

  return results;
}

/**
 * Test API key validity
 */
export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    const url = `${EODHD.BASE_URL}/real-time/AAPL.US`;
    await fetchWithRetry<EODHDRealTimePrice>(url, apiKey, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Search EODHD for an ISIN and return the primary result.
 * Prefers the result with isPrimary === true; falls back to first result.
 * Relies on Next.js Data Cache (revalidate: ISIN_CACHE_SECONDS) for deduplication —
 * identical URLs are served from cache, so calling this multiple times for the
 * same ISIN within a batch does not incur extra network requests.
 */
async function searchIsin(
  isin: string,
  apiKey?: string | null
): Promise<EODHDSearchItem | null> {
  try {
    const key = getApiKey(apiKey);
    const url = `${EODHD.BASE_URL}/search/${encodeURIComponent(isin)}?api_token=${key}&fmt=json`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: EODHD.ISIN_CACHE_SECONDS },
    });

    if (!response.ok) return null;

    const items: EODHDSearchItem[] = await response.json();
    if (!items?.length) return null;

    return items.find((i) => i.isPrimary) ?? items[0];
  } catch {
    return null;
  }
}

/**
 * Resolve ISIN to EODHD symbol + asset name.
 * Step 1: ID Mapping API — resolves the canonical symbol (never returns a name).
 * Step 2: Search API — supplementary call to retrieve the asset Name.
 * If ID Mapping fails, the Search API result is used for both symbol and name.
 * Returns symbol in format CODE.EXCHANGE (e.g., PHAU.XETRA).
 */
export async function resolveIsinToSymbol(
  isin: string,
  options?: {
    apiKey?: string | null;
  }
): Promise<ResolvedIsin | null> {
  // Step 1: ID Mapping API — gets symbol; name is not returned by this endpoint
  try {
    const key = getApiKey(options?.apiKey);
    const idMappingUrl = `${EODHD.BASE_URL}/id-mapping?filter[isin]=${encodeURIComponent(isin)}&api_token=${key}&fmt=json`;

    const response = await fetch(idMappingUrl, {
      headers: { Accept: "application/json" },
      next: { revalidate: EODHD.ISIN_CACHE_SECONDS },
    });

    if (response.ok) {
      const data: EODHDIdMappingResponse = await response.json();
      if (data.data?.length > 0 && data.data[0].symbol) {
        const symbol = data.data[0].symbol;
        // Step 2: Search API — supplementary call to get the asset name
        const hit = await searchIsin(isin, options?.apiKey);
        return { symbol, name: hit?.Name ?? null };
      }
    }
  } catch {
    // ID mapping failed — fall through to Search API for both symbol and name
  }

  // Fallback: derive symbol from Search API result (reuses cached fetch if already called above)
  try {
    const hit = await searchIsin(isin, options?.apiKey);
    if (hit?.Code && hit?.Exchange) {
      return { symbol: `${hit.Code}.${hit.Exchange}`, name: hit.Name ?? null };
    }
  } catch (error) {
    console.error(`Search failed for ISIN ${isin}:`, error);
  }

  return null;
}

/**
 * Batch resolve multiple ISINs to symbols
 * Returns a Map of ISIN -> symbol
 */
export async function batchResolveIsinsToSymbols(
  isins: string[],
  options?: {
    apiKey?: string | null;
  }
): Promise<Map<string, ResolvedIsin>> {
  const results = new Map<string, ResolvedIsin>();

  // Process sequentially to respect rate limits
  for (const isin of isins) {
    try {
      const resolved = await resolveIsinToSymbol(isin, options);
      if (resolved) {
        results.set(isin, resolved);
      }
      // Small delay between requests to avoid rate limiting
      await delay(EODHD.RATE_LIMIT_DELAY_MS);
    } catch (error) {
      console.error(`Failed to resolve ISIN ${isin}:`, error);
    }
  }

  return results;
}

/**
 * Utility function to chunk an array
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Parse EODHD date string to Date object
 */
export function parseEODHDDate(dateString: string): Date {
  return new Date(dateString + "T00:00:00.000Z");
}

/**
 * Get start date for historical backfill
 */
export function getHistoricalStartDate(): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - HISTORICAL_DATA.BACKFILL_YEARS);
  return date;
}
