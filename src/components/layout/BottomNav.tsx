"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, Wallet, TrendingUp, Home, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

// The five app domains, always reachable: Dashboard, Wallet, Investments,
// Real Estate and Settings. Domain-specific actions (add movement, add
// transaction, add property) live inside each domain's screens.
const navItems = [
  {
    href: "/",
    labelKey: "dashboard" as const,
    shortLabelKey: "dashboardShort" as const,
    icon: LayoutDashboard,
  },
  {
    href: "/wallet",
    labelKey: "wallet" as const,
    shortLabelKey: "walletShort" as const,
    icon: Wallet,
  },
  {
    href: "/investments",
    labelKey: "investments" as const,
    shortLabelKey: "investmentsShort" as const,
    icon: TrendingUp,
  },
  {
    href: "/real-estate",
    labelKey: "realEstate" as const,
    shortLabelKey: "realEstateShort" as const,
    icon: Home,
  },
  {
    href: "/settings",
    labelKey: "settings" as const,
    shortLabelKey: "settingsShort" as const,
    icon: Settings,
  },
];

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav
      className="nav-shell fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center gap-1 bg-background/90 border border-border rounded-2xl px-2 py-2 shadow-lg shadow-black/10 dark:shadow-black/30">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                aria-label={t(item.labelKey)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all duration-200",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {/* Background pill on its own element so view transitions
                    morph it between tabs (.nav-active-pill in globals.css) */}
                {isActive && (
                  <span
                    aria-hidden
                    className="nav-active-pill absolute inset-0 rounded-xl bg-primary shadow-sm"
                  />
                )}
                <item.icon className="relative z-10 h-[18px] w-[18px]" />
                {isActive && (
                  <span className="relative z-10 text-[11px] font-semibold tracking-wide">
                    {t(item.shortLabelKey)}
                  </span>
                )}
              </Link>
            );
          })}
      </div>
    </nav>
  );
}
