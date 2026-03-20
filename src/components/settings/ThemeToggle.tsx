"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { updateTheme } from "@/actions/settings";
import { Sun, Moon, Monitor, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  currentTheme: string;
}

type Theme = "light" | "dark" | "system";

const themes: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
];

export function ThemeToggle({ currentTheme }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(currentTheme as Theme);
  const [isLoading, setIsLoading] = useState(false);

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
        {themes.map(({ value, icon: Icon, label }) => (
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
            <span className="hidden sm:inline">{label}</span>
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {theme === "system"
          ? "Following your device's theme settings"
          : `Using ${theme} mode`}
      </p>
    </div>
  );
}
