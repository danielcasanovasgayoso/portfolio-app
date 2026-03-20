import { db } from "@/lib/db";
import { PRICE_CACHE } from "@/lib/constants";
import { ConfigurationError } from "@/lib/errors";

/**
 * Application settings with defaults
 */
export interface AppSettings {
  // API Keys
  eodhdApiKey: string | null;
  eodhdBackupKey: string | null;

  // Price settings
  priceCacheDurationMin: number;
  priceUpdateEnabled: boolean;

  // Gmail settings
  gmailConnected: boolean;
  gmailRefreshToken: string | null;
  lastGmailImport: Date | null;

  // Display settings
  defaultCurrency: string;
  theme: string;
  locale: string;
}

/**
 * Cached settings entry
 */
interface CachedSettings {
  data: AppSettings;
  expiresAt: Date;
}

// In-memory cache for settings (1 minute TTL)
const CACHE_TTL_MS = 60 * 1000;
let settingsCache: CachedSettings | null = null;

/**
 * Default settings values
 */
const DEFAULT_SETTINGS: AppSettings = {
  eodhdApiKey: process.env.EODHD_API_KEY || null,
  eodhdBackupKey: null,
  priceCacheDurationMin: PRICE_CACHE.DEFAULT_DURATION_MIN,
  priceUpdateEnabled: true,
  gmailConnected: false,
  gmailRefreshToken: null,
  lastGmailImport: null,
  defaultCurrency: "EUR",
  theme: "system",
  locale: "es-ES",
};

/**
 * Check if cache is still valid
 */
function isCacheValid(): boolean {
  return settingsCache !== null && settingsCache.expiresAt > new Date();
}

/**
 * Get application settings with caching
 * Reduces database calls for frequently accessed settings
 */
export async function getSettings(): Promise<AppSettings> {
  // Return cached settings if valid
  if (isCacheValid() && settingsCache) {
    return settingsCache.data;
  }

  // Fetch from database
  const dbSettings = await db.settings.findUnique({
    where: { id: "default" },
  });

  // Merge with defaults
  const settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    ...(dbSettings && {
      eodhdApiKey: dbSettings.eodhdApiKey,
      eodhdBackupKey: dbSettings.eodhdBackupKey,
      priceCacheDurationMin: dbSettings.priceCacheDurationMin,
      priceUpdateEnabled: dbSettings.priceUpdateEnabled,
      gmailConnected: dbSettings.gmailConnected,
      gmailRefreshToken: dbSettings.gmailRefreshToken,
      lastGmailImport: dbSettings.lastGmailImport,
      defaultCurrency: dbSettings.defaultCurrency,
      theme: dbSettings.theme,
      locale: dbSettings.locale,
    }),
  };

  // Update cache
  settingsCache = {
    data: settings,
    expiresAt: new Date(Date.now() + CACHE_TTL_MS),
  };

  return settings;
}

/**
 * Get settings for price operations
 * Throws if no API key is configured
 */
export async function getPriceSettings(): Promise<{
  primaryKey: string;
  backupKey: string | null;
  cacheDurationMin: number;
  updateEnabled: boolean;
}> {
  const settings = await getSettings();

  if (!settings.eodhdApiKey) {
    throw new ConfigurationError(
      "No EODHD API key configured",
      "eodhdApiKey"
    );
  }

  return {
    primaryKey: settings.eodhdApiKey,
    backupKey: settings.eodhdBackupKey,
    cacheDurationMin: settings.priceCacheDurationMin,
    updateEnabled: settings.priceUpdateEnabled,
  };
}

/**
 * Get Gmail settings
 */
export async function getGmailSettings(): Promise<{
  connected: boolean;
  refreshToken: string | null;
  lastImport: Date | null;
}> {
  const settings = await getSettings();

  return {
    connected: settings.gmailConnected,
    refreshToken: settings.gmailRefreshToken,
    lastImport: settings.lastGmailImport,
  };
}

/**
 * Invalidate settings cache
 * Call this after updating settings
 */
export function invalidateSettingsCache(): void {
  settingsCache = null;
}

/**
 * Update settings in database and invalidate cache
 */
export async function updateSettings(
  updates: Partial<Omit<AppSettings, "lastGmailImport">>
): Promise<AppSettings> {
  await db.settings.upsert({
    where: { id: "default" },
    update: updates,
    create: {
      id: "default",
      ...DEFAULT_SETTINGS,
      ...updates,
    },
  });

  // Invalidate cache to force refresh
  invalidateSettingsCache();

  return getSettings();
}

/**
 * Ensure settings record exists in database
 */
export async function ensureSettingsExist(): Promise<void> {
  const exists = await db.settings.findUnique({
    where: { id: "default" },
    select: { id: true },
  });

  if (!exists) {
    await db.settings.create({
      data: {
        id: "default",
        ...DEFAULT_SETTINGS,
      },
    });
  }
}
