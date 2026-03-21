import { Suspense } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  Calculator,
  Database,
  Download,
  Globe,
  Key,
  Palette,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { RecalculateHoldingsButton } from "@/components/settings/RecalculateHoldingsButton";
import { ApiKeyForm } from "@/components/settings/ApiKeyForm";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { LanguageSwitcher } from "@/components/settings/LanguageSwitcher";
import { DatabaseReset } from "@/components/settings/DatabaseReset";
import { ExportData } from "@/components/settings/ExportData";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getSettings } from "@/actions/settings";
import { requireAuth } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await requireAuth();
  const t = await getTranslations("settings");
  const tAuth = await getTranslations("auth");

  return (
    <div className="min-h-screen pb-20">
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

      <main className="p-4 space-y-4">
        {/* User info card — renders instantly, no data dependency */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-lg font-semibold text-primary">
                  {user.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base truncate">{user.email}</CardTitle>
                <CardDescription>{tAuth("signedIn")}</CardDescription>
              </div>
            </div>
            <div className="mt-3">
              <LogoutButton />
            </div>
          </CardHeader>
        </Card>

        {/* Settings content streams in */}
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
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t("apiConfig")}</CardTitle>
              <CardDescription>
                {t("apiConfigDesc")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ApiKeyForm
            type="primary"
            currentKey={settings.eodhdApiKey}
          />
          <p className="text-xs text-muted-foreground">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t("appearance")}</CardTitle>
              <CardDescription>
                {t("appearanceDesc")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ThemeToggle currentTheme={settings.theme} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t("language")}</CardTitle>
              <CardDescription>
                {t("languageDesc")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <LanguageSwitcher />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calculator className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t("holdingsMaintenance")}</CardTitle>
              <CardDescription>
                {t("holdingsMaintenanceDesc")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RecalculateHoldingsButton />
          <p className="text-sm text-muted-foreground mt-2">
            {t("recalculateHelp")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t("exportData")}</CardTitle>
              <CardDescription>
                {t("exportDataDesc")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ExportData />
        </CardContent>
      </Card>

      <Separator />

      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Database className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-destructive">{t("dangerZone")}</CardTitle>
              <CardDescription>
                {t("dangerZoneDesc")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DatabaseReset />
          <p className="text-sm text-muted-foreground mt-2">
            {t("resetHelp")}
          </p>
        </CardContent>
      </Card>
    </>
  );
}

function SettingsContentSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-32 w-full rounded-xl" />
      ))}
    </div>
  );
}
