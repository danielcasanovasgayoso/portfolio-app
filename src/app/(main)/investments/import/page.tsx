import { Suspense } from "react";
import { SubPageHeader } from "@/components/layout/PageHeader";
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
    <div className="min-h-screen pb-nav">
      <SubPageHeader
        title={t("title")}
        backHref="/investments"
        backLabel={t("goBack")}
      />

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
