"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { updateTheme } from "@/actions/settings";
import { Sun, Moon, Monitor, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  currentTheme: string;
}

type Theme = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "theme";
const THEME_CHANGE_EVENT = "theme-change";

export function ThemeToggle({ currentTheme }: ThemeToggleProps) {
  const t = useTranslations("settings");
  const [theme, setTheme] = useState<Theme>(currentTheme as Theme);
  const [isLoading, setIsLoading] = useState(false);

  const themes: { value: Theme; icon: typeof Sun; labelKey: "themeLight" | "themeDark" | "themeSystem" }[] = [
    { value: "light", icon: Sun, labelKey: "themeLight" },
    { value: "dark", icon: Moon, labelKey: "themeDark" },
    { value: "system", icon: Monitor, labelKey: "themeSystem" },
  ];

  const handleThemeChange = async (newTheme: Theme) => {
    if (newTheme === theme || isLoading) return;

    setIsLoading(true);
    setTheme(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));

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
