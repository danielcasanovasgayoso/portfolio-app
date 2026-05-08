"use client";

import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandableSettingsRowProps {
  icon: ComponentType<LucideProps>;
  title: string;
  sub?: string;
  /** Trailing static value shown collapsed (e.g. "Connected", "•••• abc4"). */
  value?: ReactNode;
  /** Removes the bottom divider — use on the last row of a SettingsSection. */
  last?: boolean;
  danger?: boolean;
  /** Collapsed-state body, rendered inside the summary alongside the icon/title. */
  children?: ReactNode;
  /** Default to closed. Pass true to render initially open. */
  defaultOpen?: boolean;
}

/**
 * Inline-expandable variant of SettingsRow. Uses native <details>/<summary>
 * — no JS state needed.
 */
export function ExpandableSettingsRow({
  icon: Icon,
  title,
  sub,
  value,
  last,
  danger,
  children,
  defaultOpen,
}: ExpandableSettingsRowProps) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        "group",
        last ? "" : "border-b border-[var(--outline-variant)]"
      )}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-3 transition-colors hover:bg-muted/40">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]",
            danger
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/[0.12] text-primary"
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block text-[13px] font-semibold",
              danger ? "text-destructive" : "text-foreground"
            )}
          >
            {title}
          </span>
          {sub && (
            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
              {sub}
            </span>
          )}
        </span>
        {value && (
          <span className="ml-1 font-mono text-[11px] text-muted-foreground">
            {value}
          </span>
        )}
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-3.5 pb-4 pt-1">{children}</div>
    </details>
  );
}
