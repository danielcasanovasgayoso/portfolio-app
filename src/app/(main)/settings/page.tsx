import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import {
  Database,
  Download,
  EyeOff,
  Globe,
  Key,
  Palette,
  Upload,
  User,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiKeyForm } from "@/components/settings/ApiKeyForm";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { LanguageSwitcher } from "@/components/settings/LanguageSwitcher";
import { PrivacyToggle } from "@/components/portfolio";
import { DatabaseReset } from "@/components/settings/DatabaseReset";
import { ExportData } from "@/components/settings/ExportData";
import { ImportData } from "@/components/settings/ImportData";
import { PageHeader } from "@/components/layout/PageHeader";
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
      <PageHeader title={t("title")} />

      <main className="p-4 space-y-5 max-w-5xl mx-auto md:px-8">
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
        <SettingRow
          icon={EyeOff}
          label={t("privacy")}
          description={t("privacyDesc")}
          right={<PrivacyToggle />}
        />
      </SettingSection>

      <SettingSection title={t("data")}>
        <SettingRow
          icon={Download}
          label={t("exportData")}
          description={t("exportDataDesc")}
          right={<ExportData />}
        />
        <SettingRow
          icon={Upload}
          label={t("importData")}
          description={t("importDataDesc")}
          right={<ImportData />}
        />
      </SettingSection>

      <SettingSection title={t("dangerZone")}>
        <SettingRow
          icon={Database}
          label={t("resetDatabase")}
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
