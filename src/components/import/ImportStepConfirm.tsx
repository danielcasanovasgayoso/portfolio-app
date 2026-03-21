"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Check, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { confirmImport } from "@/actions/import";
import type { ImportPreviewItem, ImportResult } from "@/types/import";

interface ImportStepConfirmProps {
  batchId: string;
  selectedItems: ImportPreviewItem[];
  onComplete: (result: ImportResult) => void;
  onBack: () => void;
  result: ImportResult | null;
  onReset: () => void;
}

export function ImportStepConfirm({
  batchId,
  selectedItems,
  onComplete,
  onBack,
  result,
  onReset,
}: ImportStepConfirmProps) {
  const t = useTranslations("import");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setIsImporting(true);
    setError(null);

    const importResult = await confirmImport(
      batchId,
      selectedItems.map((i) => i.id)
    );

    if (!importResult.success) {
      setError(importResult.error);
      setIsImporting(false);
      return;
    }

    setIsImporting(false);
    onComplete(importResult.data);
  };

  // Show result if import is complete
  if (result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <Check className="h-5 w-5" />
            {t("importComplete")}
          </CardTitle>
          <CardDescription>
            {t("importSuccessDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <div className="text-2xl font-bold text-green-600">
                {result.importedCount}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("transactionsImported")}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-2xl font-bold text-gray-600">
                {result.skippedCount}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("transactionsSkipped")}
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-md bg-yellow-50 p-4 dark:bg-yellow-900/20">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                {t("someErrors")}
              </h4>
              <ul className="mt-2 list-disc pl-5 text-sm text-yellow-700 dark:text-yellow-300">
                {result.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={onReset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("importMore")}
            </Button>
            <a
              href="/transactions"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              {t("viewTransactions")}
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("confirmImport")}</CardTitle>
        <CardDescription>
          {t("aboutToImport", { count: selectedItems.length })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border p-4">
          <h4 className="font-medium">{t("summary")}</h4>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>
              {t("buyCount", { count: selectedItems.filter((i) => i.transaction.type === "BUY").length })}
            </li>
            <li>
              {t("sellCount", { count: selectedItems.filter((i) => i.transaction.type === "SELL").length })}
            </li>
            <li>
              {t("dividendCount", { count: selectedItems.filter((i) => i.transaction.type === "DIVIDEND").length })}
            </li>
            <li>
              {t("transferCount", { count: selectedItems.filter((i) => i.transaction.type === "TRANSFER").length })}
            </li>
          </ul>
        </div>

        <p className="text-sm text-muted-foreground">
          {t("autoCreateAssets")}
        </p>

        {error && (
          <div className="rounded-md bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack} disabled={isImporting}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("back")}
          </Button>
          <Button onClick={handleImport} disabled={isImporting}>
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("importing")}
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                {t("confirmImport")}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
