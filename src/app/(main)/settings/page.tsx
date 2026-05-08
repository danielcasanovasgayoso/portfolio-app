import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import {
  Database,
  Download,
  Globe,
  Key,
  Palette,
  Upload,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ExpandableSettingsRow,
  HeroBackdrop,
  MobileShell,
  SettingsSection,
} from "@/components/pulse";
import { SettingsHero } from "@/components/settings/SettingsHero";
import { ApiKeyForm } from "@/components/settings/ApiKeyForm";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { LanguageSwitcher } from "@/components/settings/LanguageSwitcher";
import { DatabaseReset } from "@/components/settings/DatabaseReset";
import { ExportData } from "@/components/settings/ExportData";
import { ImportData } from "@/components/settings/ImportData";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getSettings } from "@/actions/settings";
import { requireAuth } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await requireAuth();

  return (
    <MobileShell>
      <HeroBackdrop height={280} orbits="left" />
      <div className="relative px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <SettingsHero email={user.email} verified />
        <Suspense fallback={<SettingsContentSkeleton />}>
          <SettingsContent />
        </Suspense>
      </div>
    </MobileShell>
  );
}

async function SettingsContent() {
  const settings = await getSettings();
  const t = await getTranslations("settings");

  return (
    <>
      <SettingsSection title={t("preferences")}>
        <ExpandableSettingsRow
          icon={Palette}
          title={t("appearance")}
          sub={t("appearanceDesc")}
        >
          <ThemeToggle currentTheme={settings.theme} />
        </ExpandableSettingsRow>
        <ExpandableSettingsRow
          icon={Globe}
          title={t("language")}
          sub={t("languageDesc")}
          last
        >
          <LanguageSwitcher />
        </ExpandableSettingsRow>
      </SettingsSection>

      <SettingsSection title={t("dataSources")}>
        <ExpandableSettingsRow
          icon={Key}
          title={t("apiConfig")}
          sub={t("apiConfigDesc")}
          value={settings.eodhdApiKey ? t("apiKeyConfigured") : t("apiKeyEmpty")}
          last
        >
          <div className="space-y-3">
            <ApiKeyForm type="primary" currentKey={settings.eodhdApiKey} />
            <p className="text-[11px] text-muted-foreground">
              {t("apiKeyGetFrom")}{" "}
              <a
                href="https://eodhd.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                eodhd.com
              </a>
            </p>
          </div>
        </ExpandableSettingsRow>
      </SettingsSection>

      <SettingsSection title={t("dataExport")}>
        <ExpandableSettingsRow
          icon={Download}
          title={t("exportData")}
          sub={t("exportDataDesc")}
        >
          <ExportData />
        </ExpandableSettingsRow>
        <ExpandableSettingsRow
          icon={Upload}
          title={t("importData")}
          sub={t("importDataDesc")}
          last
        >
          <ImportData />
        </ExpandableSettingsRow>
      </SettingsSection>

      <SettingsSection title={t("dangerZone")}>
        <ExpandableSettingsRow
          icon={Database}
          title={t("resetDatabase")}
          sub={t("dangerZoneDesc")}
          danger
          last
        >
          <div className="space-y-3">
            <DatabaseReset />
            <p className="text-[11px] text-muted-foreground">{t("resetHelp")}</p>
          </div>
        </ExpandableSettingsRow>
      </SettingsSection>

      <div className="mt-5">
        <LogoutButton variant="outline" size="default" className="w-full rounded-xl" />
      </div>
    </>
  );
}

function SettingsContentSkeleton() {
  return (
    <div className="mt-5 space-y-5">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-32 w-full rounded-2xl" />
      ))}
    </div>
  );
}
