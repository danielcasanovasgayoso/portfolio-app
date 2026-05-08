import { cn } from "@/lib/utils";

interface HeroBackdropProps {
  /** Total height of the tinted region in pixels. */
  height?: number;
  /** Use the login full-bleed gradient instead of the standard fade-to-background. */
  variant?: "default" | "login";
  /** Decorative orbit ring placement. Defaults to "right". */
  orbits?: "right" | "left" | "both" | "none";
  className?: string;
}

export function HeroBackdrop({
  height = 360,
  variant = "default",
  orbits = "right",
  className,
}: HeroBackdropProps) {
  const showRight = orbits === "right" || orbits === "both";
  const showLeft = orbits === "left" || orbits === "both";

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 overflow-hidden",
        variant === "login" ? "bg-pulse-hero-login" : "bg-pulse-hero",
        className
      )}
      style={{ height }}
    >
      {showRight && (
        <svg
          className="absolute -top-10 -right-10 opacity-[0.18]"
          width={220}
          height={220}
          viewBox="0 0 220 220"
        >
          <circle cx="110" cy="110" r="100" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="2 6" />
          <circle cx="110" cy="110" r="70" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="2 6" />
        </svg>
      )}
      {showLeft && (
        <svg
          className="absolute -top-10 -left-10 opacity-[0.16]"
          width={200}
          height={200}
          viewBox="0 0 200 200"
        >
          <circle cx="100" cy="100" r="90" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="2 6" />
          <circle cx="100" cy="100" r="60" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="2 6" />
        </svg>
      )}
    </div>
  );
}
