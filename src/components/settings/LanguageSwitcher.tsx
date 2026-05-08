"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { SegmentedControl } from "@/components/pulse";
import { updateLocale } from "@/actions/settings";
import { locales, type Locale } from "@/i18n/config";

const languageLabels: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

export function LanguageSwitcher() {
  const currentLocale = useLocale() as Locale;
  const [locale, setLocale] = useState<Locale>(currentLocale);

  const handleLocaleChange = async (newLocale: Locale) => {
    if (newLocale === locale) return;
    setLocale(newLocale);
    await updateLocale(newLocale);
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <SegmentedControl<Locale>
      options={locales}
      value={locale}
      onChange={handleLocaleChange}
      ariaLabel="Language"
      renderLabel={(o) => languageLabels[o]}
    />
  );
}
