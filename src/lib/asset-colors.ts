const ACCENT_PALETTE = [
  "#10b981", // emerald
  "#0ea5e9", // sky
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#f43f5e", // rose
  "#14b8a6", // teal
  "#d946ef", // fuchsia
  "#f97316", // orange
  "#84cc16", // lime
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#6366f1", // indigo
];

/** Stable accent for the folded-in real-estate equity row in the allocation list. */
export const REAL_ESTATE_COLOR = "#14b8a6"; // teal

function hashIndex(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % ACCENT_PALETTE.length;
}

export function getAssetAccentColor(seed: string): string {
  return ACCENT_PALETTE[hashIndex(seed)];
}

/**
 * Assigns a unique color per id when possible. Each id starts at its hash-preferred
 * color and walks the palette to find the first unused one. With more ids than palette
 * entries, later ids reuse colors starting from their preferred slot.
 */
export function assignAssetAccentColors(ids: string[]): Map<string, string> {
  const used = new Set<string>();
  const map = new Map<string, string>();

  for (const id of ids) {
    const start = hashIndex(id);
    let chosen: string | null = null;
    for (let offset = 0; offset < ACCENT_PALETTE.length; offset++) {
      const candidate = ACCENT_PALETTE[(start + offset) % ACCENT_PALETTE.length];
      if (!used.has(candidate)) {
        chosen = candidate;
        break;
      }
    }
    if (chosen === null) {
      chosen = ACCENT_PALETTE[start];
    } else {
      used.add(chosen);
    }
    map.set(id, chosen);
  }

  return map;
}
