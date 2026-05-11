"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { exportPortfolioData } from "@/actions/settings";
import { useActionError } from "@/lib/use-action-error";
import { Download, Loader2, Check } from "lucide-react";

export function ExportData() {
  const t = useTranslations("settings");
  const translateError = useActionError();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    const result = await exportPortfolioData();

    if (result.success && result.data) {
      // Create and download file
      const blob = new Blob([result.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `portfolio-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(translateError({ error: result.error ?? "", code: result.code }));
      setTimeout(() => setError(null), 5000);
    }

    setIsLoading(false);
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : success ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {t("exportButton")}
      </Button>

      {success && (
        <p className="text-xs text-green-600">{t("exportSuccess")}</p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
