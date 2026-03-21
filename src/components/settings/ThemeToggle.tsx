"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { updateTheme } from "@/actions/settings";
import { Sun, Moon, Monitor, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  currentTheme: string;
}

type Theme = "light" | "dark" | "system";

export function ThemeToggle({ currentTheme }: ThemeToggleProps) {
  const t = useTranslations("settings");
  const [theme, setTheme] = useState<Theme>(currentTheme as Theme);
  const [isLoading, setIsLoading] = useState(false);

  const themes: { value: Theme; icon: typeof Sun; labelKey: "themeLight" | "themeDark" | "themeSystem" }[] = [
    { value: "light", icon: Sun, labelKey: "themeLight" },
    { value: "dark", icon: Moon, labelKey: "themeDark" },
    { value: "system", icon: Monitor, labelKey: "themeSystem" },
  ];

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const effectiveTheme =
        theme === "system"
          ? mediaQuery.matches
            ? "dark"
            : "light"
          : theme;

      root.classList.remove("light", "dark");
      root.classList.add(effectiveTheme);
    };

    applyTheme();

    // Listen for system theme changes
    if (theme === "system") {
      mediaQuery.addEventListener("change", applyTheme);
      return () => mediaQuery.removeEventListener("change", applyTheme);
    }
  }, [theme]);

  const handleThemeChange = async (newTheme: Theme) => {
    if (newTheme === theme || isLoading) return;

    setIsLoading(true);
    setTheme(newTheme);

    await updateTheme(newTheme);
    setIsLoading(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {themes.map(({ value, icon: Icon, labelKey }) => (
          <Button
            key={value}
            variant={theme === value ? "default" : "outline"}
            size="sm"
            onClick={() => handleThemeChange(value)}
            disabled={isLoading}
            className={cn(
              "flex-1 gap-2",
              theme === value && "pointer-events-none"
            )}
          >
            {isLoading && theme === value ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icon className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{t(labelKey)}</span>
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {theme === "system"
          ? t("themeFollowing")
          : t("themeUsing", { theme: t(theme === "light" ? "themeLight" : "themeDark").toLowerCase() })}
      </p>
    </div>
  );
}
