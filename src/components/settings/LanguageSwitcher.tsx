"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { updateLocale } from "@/actions/settings";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { locales, type Locale } from "@/i18n/config";

const languageLabels: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

export function LanguageSwitcher() {
  const currentLocale = useLocale() as Locale;
  const [locale, setLocale] = useState<Locale>(currentLocale);
  const [isLoading, setIsLoading] = useState(false);

  const handleLocaleChange = async (newLocale: Locale) => {
    if (newLocale === locale || isLoading) return;

    setIsLoading(true);
    setLocale(newLocale);

    await updateLocale(newLocale);
    // Force full page reload to apply new locale across all components
    window.location.reload();
  };

  return (
    <div className="flex gap-2">
      {locales.map((loc) => (
        <Button
          key={loc}
          variant={locale === loc ? "default" : "outline"}
          size="sm"
          onClick={() => handleLocaleChange(loc)}
          disabled={isLoading}
          className={cn(
            "flex-1 gap-2",
            locale === loc && "pointer-events-none"
          )}
        >
          {isLoading && locale === loc ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          {languageLabels[loc]}
        </Button>
      ))}
    </div>
  );
}
