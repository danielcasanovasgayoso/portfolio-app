"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { PieChart, FileText, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/",
    labelKey: "portfolio" as const,
    shortLabelKey: "home" as const,
    icon: PieChart,
  },
  {
    href: "/transactions",
    labelKey: "transactions" as const,
    shortLabelKey: "transactionsShort" as const,
    icon: FileText,
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
  const isAddActive = pathname === "/add";

  return (
    <nav
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center gap-1 bg-background/80 backdrop-blur-xl border border-border rounded-2xl px-2 py-2 shadow-lg shadow-black/10 dark:shadow-black/30">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/" || pathname.startsWith("/portfolio/")
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {isActive && (
                <span className="text-[11px] font-semibold tracking-wide">
                  {t(item.shortLabelKey)}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <Link
        href="/add"
        prefetch={true}
        className={cn(
          "flex items-center justify-center h-11 w-11 rounded-2xl shadow-lg shadow-black/10 dark:shadow-black/30 transition-all duration-200 active:scale-95",
          isAddActive
            ? "bg-primary text-primary-foreground"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        aria-label={t("addTransactions")}
      >
        <Plus className="h-5 w-5" />
      </Link>
    </nav>
  );
}
