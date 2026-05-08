import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { HeroBackdrop, MobileShell, PageHeader } from "@/components/pulse";
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
    <MobileShell>
      <HeroBackdrop height={160} orbits="right" />
      <div className="relative px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <PageHeader title={t("title")} backLabel={t("goBack")} backHref="/add" />

        <div className="mt-4 space-y-4">
          {error && (
            <div className="rounded-xl bg-loss-muted px-3 py-2.5 text-[12px] text-loss">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl bg-gain-muted px-3 py-2.5 text-[12px] text-gain">
              {success}
            </div>
          )}

          <Suspense
            fallback={
              <div className="h-48 animate-pulse rounded-2xl bg-card" />
            }
          >
            <ImportContent />
          </Suspense>
        </div>
      </div>
    </MobileShell>
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
