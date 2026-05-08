"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Home, List, Plus, Search, Settings, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NavLabelKey = "portfolio" | "transactions" | "search" | "settings";

type NavSlot = {
  href: string;
  labelKey: NavLabelKey;
  icon: LucideIcon;
  isActive: (pathname: string, focus: string) => boolean;
};

const slots: NavSlot[] = [
  {
    href: "/",
    labelKey: "portfolio",
    icon: Home,
    isActive: (p) => p === "/" || p.startsWith("/portfolio/"),
  },
  {
    href: "/transactions",
    labelKey: "transactions",
    icon: List,
    isActive: (p, focus) => p === "/transactions" && focus !== "search",
  },
  {
    href: "/transactions?focus=search",
    labelKey: "search",
    icon: Search,
    isActive: (p, focus) => p === "/transactions" && focus === "search",
  },
  {
    href: "/settings",
    labelKey: "settings",
    icon: Settings,
    isActive: (p) => p.startsWith("/settings"),
  },
];

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [focus, setFocus] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () =>
      setFocus(new URLSearchParams(window.location.search).get("focus") ?? "");
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [pathname]);

  const isAddActive = pathname === "/add" || pathname.startsWith("/add/");

  return (
    <nav
      aria-label={t("portfolio")}
      className="glass-dock fixed left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-[26rem] -translate-x-1/2 items-center justify-between gap-2 rounded-2xl px-2 py-2 shadow-lg"
      style={{
        bottom: "calc(0.875rem + env(safe-area-inset-bottom))",
      }}
    >
      {slots.slice(0, 2).map((slot) => (
        <NavTab
          key={slot.labelKey}
          slot={slot}
          active={slot.isActive(pathname, focus)}
          label={t(slot.labelKey)}
        />
      ))}

      <Link
        href="/add"
        prefetch
        aria-label={t("addTransactions")}
        className={cn(
          "flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition-transform duration-200 active:scale-95",
          "shadow-[0_8px_20px_-6px_rgba(70,72,212,0.6)]",
          isAddActive ? "ring-2 ring-primary/40" : "hover:bg-primary/90"
        )}
      >
        <Plus className="h-5 w-5" />
      </Link>

      {slots.slice(2).map((slot) => (
        <NavTab
          key={slot.labelKey}
          slot={slot}
          active={slot.isActive(pathname, focus)}
          label={t(slot.labelKey)}
        />
      ))}
    </nav>
  );
}

function NavTab({
  slot,
  active,
  label,
}: {
  slot: NavSlot;
  active: boolean;
  label: string;
}) {
  const Icon = slot.icon;
  return (
    <Link
      href={slot.href}
      prefetch
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 items-center justify-center rounded-xl py-2.5 transition-colors duration-200",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
    </Link>
  );
}
