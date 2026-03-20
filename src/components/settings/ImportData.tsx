"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { importPortfolioData } from "@/actions/settings";
import { Upload, Loader2, Check, AlertCircle } from "lucide-react";

export function ImportData() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith(".json")) {
      setResult({ success: false, message: "Please select a JSON file" });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const text = await file.text();
      const response = await importPortfolioData(text);

      if (response.success && response.data) {
        const { assetsImported, transactionsImported, assetsSkipped, transactionsSkipped } = response.data;
        setResult({
          success: true,
          message: `Imported ${assetsImported} assets and ${transactionsImported} transactions. Skipped: ${assetsSkipped} assets, ${transactionsSkipped} transactions.`,
        });
      } else {
        setResult({
          success: false,
          message: response.error || "Failed to import data",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to read file",
      });
    } finally {
      setIsLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <input
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        ref={fileInputRef}
        className="hidden"
      />

      <Button
        variant="outline"
        onClick={handleClick}
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : result?.success ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        Import Portfolio Data
      </Button>

      {result && (
        <div className={`flex items-start gap-2 text-sm ${result.success ? "text-green-600" : "text-destructive"}`}>
          {!result.success && <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
          <p>{result.message}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Import a previously exported JSON file to restore your portfolio data.
        Existing assets with the same ISIN will be skipped.
      </p>
    </div>
  );
}
