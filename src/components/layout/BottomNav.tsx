"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PieChart, FileText, Settings, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/",
    label: "Portfolio",
    shortLabel: "PORT",
    icon: PieChart,
  },
  {
    href: "/transactions",
    label: "Transactions",
    shortLabel: "TXN",
    icon: FileText,
  },
  {
    href: "/settings",
    label: "Settings",
    shortLabel: "CFG",
    icon: Settings,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div
        className="flex justify-around items-center h-16"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/" || pathname.startsWith("/portfolio/")
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1.5 px-6 py-2 min-w-[80px] transition-all duration-300",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Active indicator glow */}
              {isActive && (
                <div
                  className="absolute -top-px left-1/2 -translate-x-1/2 w-12 h-[2px] bg-primary rounded-full glow-primary"
                  aria-hidden="true"
                />
              )}

              {/* Icon container */}
              <div
                className={cn(
                  "relative p-2 rounded-lg transition-all duration-300",
                  isActive && "bg-primary/10"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-300",
                    isActive && "scale-110"
                  )}
                />

                {/* Pulse indicator for portfolio */}
                {item.href === "/" && isActive && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-gain animate-pulse" />
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-[10px] font-mono uppercase tracking-widest transition-all duration-300",
                  isActive ? "font-semibold" : "font-medium"
                )}
              >
                {item.shortLabel}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
