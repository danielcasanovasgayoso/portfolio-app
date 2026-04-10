/**
 * Application-wide constants
 * Centralized configuration values to avoid magic numbers
 */

// EODHD API Configuration
export const EODHD = {
  BASE_URL: "https://eodhd.com/api",
  BATCH_SIZE: 50,
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY_MS: 300,
  RATE_LIMIT_DELAY_MS: 100,
  CACHE_REVALIDATE_SECONDS: 300, // 5 minutes
  ISIN_CACHE_SECONDS: 86400, // 24 hours
  FUND_EXCHANGE_SUFFIX: ".EUFUND",
} as const;

// Market Hours (UTC)
export const MARKET_HOURS = {
  // European markets: ~7:00-17:30 UTC
  // US markets: ~14:30-21:00 UTC
  // Combined window for cache optimization
  START_UTC: 7,
  END_UTC: 21,
} as const;

// Price Cache Configuration
export const PRICE_CACHE = {
  DEFAULT_DURATION_MIN: 60,
  AFTER_HOURS_DURATION_HOURS: 24,
} as const;

// Gmail Import Configuration
export const GMAIL_IMPORT = {
  MAX_RESULTS_DEFAULT: 100,
  SENDER: "notificaciones@myinvestor.es",
  BATCH_SIZE: 100,
} as const;

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 20,
  MAX_PER_PAGE: 100,
} as const;

// Animation Stagger Configuration
export const ANIMATION = {
  MAX_STAGGER_INDEX: 6,
} as const;
