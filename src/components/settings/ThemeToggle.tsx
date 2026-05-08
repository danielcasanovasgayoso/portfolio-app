"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SegmentedControl } from "@/components/pulse";
import { updateTheme } from "@/actions/settings";

interface ThemeToggleProps {
  currentTheme: string;
}

type Theme = "light" | "dark" | "system";

const THEMES: readonly Theme[] = ["system", "light", "dark"] as const;
const THEME_STORAGE_KEY = "theme";
const THEME_CHANGE_EVENT = "theme-change";

export function ThemeToggle({ currentTheme }: ThemeToggleProps) {
  const t = useTranslations("settings");
  const [theme, setTheme] = useState<Theme>(
    (THEMES.includes(currentTheme as Theme) ? currentTheme : "system") as Theme
  );

  const handleThemeChange = (next: Theme) => {
    if (next === theme) return;
    setTheme(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
      window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
    }
    void updateTheme(next);
  };

  const labels: Record<Theme, string> = {
    system: t("themeSystem"),
    light: t("themeLight"),
    dark: t("themeDark"),
  };

  return (
    <SegmentedControl<Theme>
      options={THEMES}
      value={theme}
      onChange={handleThemeChange}
      ariaLabel={t("appearance")}
      renderLabel={(o) => labels[o]}
    />
  );
}
