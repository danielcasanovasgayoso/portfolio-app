import Link from "next/link";
import { ArrowLeft, Database, Key, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-9 w-9">
            <Link href="/" aria-label="Back to portfolio">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            Settings
          </h1>
        </div>
      </header>

      <main className="p-4 space-y-4">
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
          <CardContent>
            <p className="text-sm text-muted-foreground">
              API key configuration will be available in Phase 4.
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
            <p className="text-sm text-muted-foreground">
              Theme settings will be available in Phase 4. Currently using
              system preference.
            </p>
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
            <Button variant="destructive" disabled>
              Reset Database
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Database reset will be available in Phase 4.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
