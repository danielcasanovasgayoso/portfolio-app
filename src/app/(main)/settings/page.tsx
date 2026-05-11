import { Suspense } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  Database,
  Download,
  Globe,
  Key,
  Palette,
  User,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiKeyForm } from "@/components/settings/ApiKeyForm";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { LanguageSwitcher } from "@/components/settings/LanguageSwitcher";
import { DatabaseReset } from "@/components/settings/DatabaseReset";
import { ExportData } from "@/components/settings/ExportData";
import {
  SettingRow,
  SettingSection,
} from "@/components/settings/SettingRow";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getSettings } from "@/actions/settings";
import { requireAuth } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await requireAuth();
  const t = await getTranslations("settings");
  const tAuth = await getTranslations("auth");

  return (
    <div className="min-h-screen pb-nav">
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label={t("backToPortfolio")}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              {t("title")}
            </h1>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-5">
        {/* Account section — renders instantly */}
        <SettingSection title={t("account")}>
          <SettingRow
            icon={User}
            label={user.email}
            description={tAuth("signedIn")}
            right={<LogoutButton />}
          />
        </SettingSection>

        <Suspense fallback={<SettingsContentSkeleton />}>
          <SettingsContent />
        </Suspense>
      </main>
    </div>
  );
}

async function SettingsContent() {
  const settings = await getSettings();
  const t = await getTranslations("settings");

  return (
    <>
      <SettingSection title={t("dataSources")}>
        <SettingRow
          icon={Key}
          label={t("apiConfig")}
          description="eodhd.com"
        >
          <ApiKeyForm type="primary" currentKey={settings.eodhdApiKey} />
        </SettingRow>
      </SettingSection>

      <SettingSection title={t("preferences")}>
        <SettingRow
          icon={Palette}
          label={t("appearance")}
          description={t("appearanceDesc")}
        >
          <ThemeToggle currentTheme={settings.theme} />
        </SettingRow>
        <SettingRow
          icon={Globe}
          label={t("language")}
          description={t("languageDesc")}
        >
          <LanguageSwitcher />
        </SettingRow>
      </SettingSection>

      <SettingSection title={t("data")}>
        <SettingRow
          icon={Download}
          label={t("exportData")}
          description={t("exportDataDesc")}
          right={<ExportData />}
        />
      </SettingSection>

      <SettingSection title={t("dangerZone")}>
        <SettingRow
          icon={Database}
          label={t("resetDatabase")}
          description={t("resetHelp")}
          destructive
          right={<DatabaseReset />}
        />
      </SettingSection>
    </>
  );
}

function SettingsContentSkeleton() {
  return (
    <div className="space-y-5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24 ml-2" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}
