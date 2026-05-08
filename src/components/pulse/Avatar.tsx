import { cn } from "@/lib/utils";
import { getAvatarColor, getAvatarInitial } from "@/lib/avatarColor";

interface AvatarProps {
  /** Source string used to derive both initial and color. */
  seed: string;
  /** Override the displayed initial (e.g. for an emoji or named user). */
  label?: string;
  /** Override the background color. */
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClass: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-9 w-9 rounded-[10px] text-[13px]",
  md: "h-12 w-12 rounded-[14px] text-base",
  lg: "h-14 w-14 rounded-[18px] text-2xl",
};

export function Avatar({ seed, label, color, size = "sm", className }: AvatarProps) {
  const bg = color ?? getAvatarColor(seed);
  const initial = label ?? getAvatarInitial(seed);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-bold text-white",
        sizeClass[size],
        className
      )}
      style={{ backgroundColor: bg }}
      aria-hidden
    >
      {initial}
    </span>
  );
}
