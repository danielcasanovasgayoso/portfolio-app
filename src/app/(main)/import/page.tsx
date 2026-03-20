import { Suspense } from "react";
import { GmailConnectCard, ImportWizard } from "@/components/import";
import { checkGmailConnection } from "@/actions/import";
import { requireAuth } from "@/lib/auth";

export const metadata = {
  title: "Import Transactions | Portfolio Tracker",
  description: "Import transactions from Gmail",
};

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAuth();
  const { error, success } = await searchParams;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Import Transactions</h1>
        <p className="text-muted-foreground">
          Import transactions from MyInvestor notification emails
        </p>
      </div>

      {/* Status messages */}
      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-200">
          {success}
        </div>
      )}

      <div className="space-y-6">
        <Suspense
          fallback={
            <div className="h-48 animate-pulse rounded-lg bg-muted" />
          }
        >
          <ImportContent />
        </Suspense>
      </div>
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
