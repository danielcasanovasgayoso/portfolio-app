import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { GlassButton, GlassLink } from "./GlassButton";
import { HeroHeader } from "./HeroHeader";

interface PageHeaderProps {
  title: string;
  /** Where the back button should navigate. Defaults to `/`. */
  backHref?: string;
  /** Use a button-shaped back action that calls `onBack()` instead of a link. */
  onBack?: () => void;
  backLabel?: string;
  right?: ReactNode;
  /** Optional sub-line below the title, e.g. a mono value. */
  subtitle?: ReactNode;
}

export function PageHeader({
  title,
  backHref = "/",
  onBack,
  backLabel,
  right,
  subtitle,
}: PageHeaderProps) {
  const back = onBack ? (
    <GlassButton aria-label={backLabel ?? "Back"} onClick={onBack}>
      <ArrowLeft className="h-4 w-4" />
    </GlassButton>
  ) : (
    <GlassLink href={backHref} aria-label={backLabel ?? "Back"}>
      <ArrowLeft className="h-4 w-4" />
    </GlassLink>
  );

  return (
    <HeroHeader
      left={back}
      center={
        <div className="leading-tight">
          <div className="text-[14px] font-semibold text-white">{title}</div>
          {subtitle && (
            <div className="mt-0.5 font-mono text-[11px] text-white/70">{subtitle}</div>
          )}
        </div>
      }
      right={right ?? null}
    />
  );
}
