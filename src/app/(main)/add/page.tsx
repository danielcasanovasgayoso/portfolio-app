"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Mail,
  Upload,
  ArrowLeft,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { importPortfolioData } from "@/actions/settings";

export default function AddPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      setImportResult({ success: false, message: "Please select a JSON file" });
      setTimeout(() => setImportResult(null), 5000);
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const response = await importPortfolioData(text);

      if (response.success && response.data) {
        const { assetsImported, transactionsImported } = response.data;
        setImportResult({
          success: true,
          message: `Imported ${assetsImported} assets and ${transactionsImported} transactions`,
        });
      } else {
        setImportResult({
          success: false,
          message: response.error || "Failed to import data",
        });
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to read file",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setTimeout(() => setImportResult(null), 5000);
    }
  };

  const options = [
    {
      icon: Plus,
      label: "Add Transaction",
      description: "Manually add a new transaction",
      onClick: () => router.push("/transactions?openForm=true"),
    },
    {
      icon: Mail,
      label: "Import from Gmail",
      description: "Import transactions from MyInvestor emails",
      onClick: () => router.push("/import"),
    },
    {
      icon: Upload,
      label: "Import from JSON",
      description: "Import portfolio data from a JSON file",
      onClick: handleImportClick,
    },
  ];

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            Add
          </h1>
        </div>
      </header>

      <main className="p-4 space-y-3">
        {/* Hidden file input for JSON import */}
        <input
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          ref={fileInputRef}
          className="hidden"
        />

        {/* Import result feedback */}
        {importResult && (
          <div
            className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
              importResult.success
                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {importResult.success ? (
              <Check className="h-4 w-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
            )}
            {importResult.message}
          </div>
        )}

        {options.map((option) => (
          <button
            key={option.label}
            onClick={option.onClick}
            disabled={isImporting && option.label === "Import from JSON"}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:bg-muted/50 active:scale-[0.98] transition-all text-left"
          >
            <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-primary/10 text-primary flex-shrink-0">
              {isImporting && option.label === "Import from JSON" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <option.icon className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="font-medium text-foreground">{option.label}</p>
              <p className="text-sm text-muted-foreground">
                {option.description}
              </p>
            </div>
          </button>
        ))}
      </main>
    </div>
  );
}
