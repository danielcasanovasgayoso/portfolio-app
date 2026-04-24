import { cache } from "react";
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
 * Get application settings for a user.
 *
 * Wrapped in `React.cache()` for request-scoped deduplication — within a
 * single server render, repeated calls for the same userId share one DB hit.
 * Across requests or serverless invocations, each call hits Postgres fresh,
 * which avoids the cross-instance staleness that a process-wide cache would
 * introduce on Vercel.
 */
export const getSettings = cache(async (userId: string): Promise<AppSettings> => {
  const dbSettings = await db.settings.findUnique({
    where: { userId },
  });

  return {
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
});

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
 * Update settings in database for a user.
 * No explicit cache invalidation is needed: `getSettings` is request-scoped,
 * and after a mutation callers are expected to `revalidatePath` so the next
 * render triggers a fresh query.
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
