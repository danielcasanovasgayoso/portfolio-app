"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import type { LucideProps } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsRowBaseProps {
  icon: ComponentType<LucideProps>;
  title: string;
  sub?: string;
  /** Trailing static value (e.g. "•••• abc4", "Connected"). */
  value?: ReactNode;
  /** Replaces the default chevron with a custom right-side element (e.g. switch, segmented control). */
  trailing?: ReactNode;
  /** Hides the default chevron. Implied when `trailing` is set. */
  hideChevron?: boolean;
  /** Removes the bottom divider — use on the last row of a SettingsSection. */
  last?: boolean;
  danger?: boolean;
}

interface SettingsRowLinkProps extends SettingsRowBaseProps {
  href: string;
  onClick?: never;
}
interface SettingsRowButtonProps extends SettingsRowBaseProps {
  onClick: () => void;
  href?: never;
}
interface SettingsRowStaticProps extends SettingsRowBaseProps {
  href?: never;
  onClick?: never;
}

type SettingsRowProps = SettingsRowLinkProps | SettingsRowButtonProps | SettingsRowStaticProps;

export function SettingsRow(props: SettingsRowProps) {
  const {
    icon: Icon,
    title,
    sub,
    value,
    trailing,
    hideChevron,
    last,
    danger,
  } = props;

  const content = (
    <div
      className={cn(
        "flex items-center gap-3 px-3.5 py-3",
        last ? "" : "border-b border-[var(--outline-variant)]"
      )}
    >
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
        <span className="ml-1 font-mono text-[11px] text-muted-foreground">{value}</span>
      )}
      {trailing}
      {!trailing && !hideChevron && (
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </div>
  );

  if ("href" in props && props.href) {
    return (
      <Link
        href={props.href}
        className="block transition-colors hover:bg-muted/40 active:bg-muted/60"
      >
        {content}
      </Link>
    );
  }
  if ("onClick" in props && props.onClick) {
    return (
      <button
        type="button"
        onClick={props.onClick}
        className="block w-full text-left transition-colors hover:bg-muted/40 active:bg-muted/60"
      >
        {content}
      </button>
    );
  }
  return content;
}
