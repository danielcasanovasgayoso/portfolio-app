"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { exportPortfolioData } from "@/actions/settings";
import { Download, Loader2, Check } from "lucide-react";

export function ExportData() {
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
      setError(result.error || "Failed to export data");
      setTimeout(() => setError(null), 5000);
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
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
        Export Portfolio Data
      </Button>

      {success && (
        <p className="text-sm text-green-600">
          Export downloaded successfully
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <p className="text-xs text-muted-foreground">
        Downloads a JSON file with all your assets, transactions, and holdings.
      </p>
    </div>
  );
}
