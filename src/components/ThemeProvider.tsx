"use client";

import { useEffect } from "react";

const THEME_STORAGE_KEY = "theme";
const THEME_CHANGE_EVENT = "theme-change";

type Theme = "light" | "dark" | "system";

function setStoredTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage access errors; applying the theme class still keeps the UI correct.
  }
}

function getStoredTheme(fallbackTheme: Theme): Theme {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
      return storedTheme;
    }
  } catch {
    // Ignore storage access errors and fall back to the server-provided preference.
  }

  return fallbackTheme;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const effectiveTheme =
    theme === "system"
      ? mediaQuery.matches
        ? "dark"
        : "light"
      : theme;

  root.classList.remove("light", "dark");
  root.classList.add(effectiveTheme);
}

export function ThemeProvider({
  children,
  initialTheme = "system",
}: {
  children: React.ReactNode;
  initialTheme?: Theme;
}) {
  useEffect(() => {
    setStoredTheme(initialTheme);
    applyTheme(initialTheme);
  }, [initialTheme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => {
      const nextTheme = getStoredTheme(initialTheme);
      applyTheme(nextTheme);
    };

    syncTheme();

    const handleSystemThemeChange = () => {
      if (getStoredTheme(initialTheme) === "system") {
        applyTheme("system");
      }
    };

    window.addEventListener("storage", syncTheme);
    window.addEventListener(THEME_CHANGE_EVENT, syncTheme);
    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener(THEME_CHANGE_EVENT, syncTheme);
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [initialTheme]);

  return <>{children}</>;
}
