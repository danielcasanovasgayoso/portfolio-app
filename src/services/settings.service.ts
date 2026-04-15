import { db } from "@/lib/db";
import { PRICE_CACHE } from "@/lib/constants";
import { decryptIfEncrypted } from "@/lib/crypto";

/**
 * Application settings with defaults
 */
export interface AppSettings {
  // API Key
  eodhdApiKey: string | null;

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
 * Cached settings entry (per user)
 */
interface CachedSettings {
  data: AppSettings;
  expiresAt: Date;
}

// In-memory cache for settings (1 minute TTL, keyed by userId)
const CACHE_TTL_MS = 60 * 1000;
const settingsCache = new Map<string, CachedSettings>();

/**
 * Default settings values
 */
const DEFAULT_SETTINGS: AppSettings = {
  eodhdApiKey: process.env.EODHD_API_KEY || null,
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
 * Check if cache is still valid for a user
 */
function isCacheValid(userId: string): boolean {
  const cached = settingsCache.get(userId);
  return cached !== null && cached !== undefined && cached.expiresAt > new Date();
}

/**
 * Get application settings for a user with caching
 * Reduces database calls for frequently accessed settings
 */
export async function getSettings(userId: string): Promise<AppSettings> {
  // Return cached settings if valid
  if (isCacheValid(userId)) {
    return settingsCache.get(userId)!.data;
  }

  // Fetch from database
  const dbSettings = await db.settings.findUnique({
    where: { userId },
  });

  // Merge with defaults, decrypting sensitive fields on the way out
  const settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    ...(dbSettings && {
      eodhdApiKey: dbSettings.eodhdApiKey
        ? decryptIfEncrypted(dbSettings.eodhdApiKey)
        : null,
      priceCacheDurationMin: dbSettings.priceCacheDurationMin,
      priceUpdateEnabled: dbSettings.priceUpdateEnabled,
      gmailConnected: dbSettings.gmailConnected,
      gmailRefreshToken: dbSettings.gmailRefreshToken
        ? decryptIfEncrypted(dbSettings.gmailRefreshToken)
        : null,
      lastGmailImport: dbSettings.lastGmailImport,
      defaultCurrency: dbSettings.defaultCurrency,
      theme: dbSettings.theme,
      locale: dbSettings.locale,
    }),
  };

  // Update cache
  settingsCache.set(userId, {
    data: settings,
    expiresAt: new Date(Date.now() + CACHE_TTL_MS),
  });

  return settings;
}

/**
 * Get Gmail settings for a user
 * Reads directly from the database instead of the in-memory cache so OAuth
 * callback updates are visible immediately on the import screen.
 */
export async function getGmailSettings(userId: string): Promise<{
  connected: boolean;
  refreshToken: string | null;
  lastImport: Date | null;
}> {
  const dbSettings = await db.settings.findUnique({
    where: { userId },
    select: {
      gmailConnected: true,
      gmailRefreshToken: true,
      lastGmailImport: true,
    },
  });

  return {
    connected: dbSettings?.gmailConnected ?? DEFAULT_SETTINGS.gmailConnected,
    refreshToken: dbSettings?.gmailRefreshToken
      ? decryptIfEncrypted(dbSettings.gmailRefreshToken)
      : DEFAULT_SETTINGS.gmailRefreshToken,
    lastImport: dbSettings?.lastGmailImport ?? DEFAULT_SETTINGS.lastGmailImport,
  };
}

/**
 * Invalidate settings cache for a user
 * Call this after updating settings
 */
export function invalidateSettingsCache(userId: string): void {
  settingsCache.delete(userId);
}

/**
 * Update settings in database for a user and invalidate cache
 */
export async function updateSettings(
  userId: string,
  updates: Partial<Omit<AppSettings, "lastGmailImport">>
): Promise<AppSettings> {
  await db.settings.upsert({
    where: { userId },
    update: updates,
    create: {
      userId,
      ...DEFAULT_SETTINGS,
      ...updates,
    },
  });

  // Invalidate cache to force refresh
  invalidateSettingsCache(userId);

  return getSettings(userId);
}

/**
 * Ensure settings record exists in database for a user
 */
export async function ensureSettingsExist(userId: string): Promise<void> {
  const exists = await db.settings.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!exists) {
    await db.settings.create({
      data: {
        userId,
        ...DEFAULT_SETTINGS,
      },
    });
  }
}
