import { Suspense } from "react";
import { BackButton } from "@/components/ui/back-button";
import { getTranslations } from "next-intl/server";
import { GmailConnectCard, ImportWizard } from "@/components/import";
import { checkGmailConnection } from "@/actions/import";
import { requireAuth } from "@/lib/auth";

export async function generateMetadata() {
  const t = await getTranslations("meta");
  return {
    title: t("importTitle"),
    description: t("importDescription"),
  };
}

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAuth();
  const { error, success } = await searchParams;
  const t = await getTranslations("import");

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3">
          <BackButton label={t("goBack")} />
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Status messages */}
        {error && (
          <div className="rounded-md bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-green-50 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-200">
            {success}
          </div>
        )}

        <Suspense
          fallback={
            <div className="h-48 animate-pulse rounded-lg bg-muted" />
          }
        >
          <ImportContent />
        </Suspense>
      </main>
    </div>
  );
}

async function ImportContent() {
  const connectionResult = await checkGmailConnection();

  const isConnected = connectionResult.success
    ? connectionResult.data.connected
    : false;
  const canFetch = connectionResult.success
    ? connectionResult.data.canFetch
    : false;

  return (
    <>
      <GmailConnectCard isConnected={isConnected} canFetch={canFetch} />

      {isConnected && <ImportWizard canFetch={canFetch} />}
    </>
  );
}
