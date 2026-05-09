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

export function getAssetAccentColor(seed: string): string {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % ACCENT_PALETTE.length;
  return ACCENT_PALETTE[index];
}
