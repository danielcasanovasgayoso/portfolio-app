import Link from "next/link";
import {
  ArrowLeft,
  Calculator,
  Database,
  FolderSync,
  Key,
  Palette,
  LogOut,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RecalculateHoldingsButton } from "@/components/settings/RecalculateHoldingsButton";
import { ApiKeyForm } from "@/components/settings/ApiKeyForm";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { DatabaseReset } from "@/components/settings/DatabaseReset";
import { ExportData } from "@/components/settings/ExportData";
import { ImportData } from "@/components/settings/ImportData";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getSettings } from "@/actions/settings";
import { requireAuth } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await requireAuth();
  const settings = await getSettings();

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="Back to portfolio"
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Settings
            </h1>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* User info card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">
                    {user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <CardTitle className="text-base">{user.email}</CardTitle>
                  <CardDescription>Signed in</CardDescription>
                </div>
              </div>
              <LogoutButton />
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>API Configuration</CardTitle>
                <CardDescription>
                  Configure your EODHD API keys for price updates
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <ApiKeyForm
              type="primary"
              currentKey={settings.eodhdApiKey}
              label="Primary API Key"
            />
            <Separator />
            <ApiKeyForm
              type="backup"
              currentKey={settings.eodhdBackupKey}
              label="Backup API Key (Optional)"
            />
            <p className="text-xs text-muted-foreground">
              Get your API key from{" "}
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
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Customize the look and feel of the app
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
                <Calculator className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Holdings Maintenance</CardTitle>
                <CardDescription>
                  Recalculate holdings from transaction history
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RecalculateHoldingsButton />
            <p className="text-sm text-muted-foreground mt-2">
              Use this if your portfolio totals seem incorrect after importing
              transactions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderSync className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Data Import / Export</CardTitle>
                <CardDescription>
                  Import or export your portfolio data as JSON
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <ExportData />
            <Separator />
            <ImportData />
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
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible actions for your portfolio data
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DatabaseReset />
            <p className="text-sm text-muted-foreground mt-2">
              This will permanently delete all your portfolio data. API keys and
              theme settings will be preserved.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
