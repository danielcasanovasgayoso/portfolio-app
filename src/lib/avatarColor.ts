const AVATAR_PALETTE = [
  "#4F46E5",
  "#7C3AED",
  "#0EA5E9",
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
] as const;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getAvatarColor(seed: string): string {
  const key = seed.length === 0 ? "?" : seed;
  return AVATAR_PALETTE[hashString(key) % AVATAR_PALETTE.length];
}

export function getAvatarInitial(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "?";
  const firstChar = [...trimmed][0];
  return (firstChar ?? "?").toUpperCase();
}
