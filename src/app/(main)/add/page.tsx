"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Plus,
  Mail,
  Upload,
  Loader2,
  Check,
  AlertCircle,
  Landmark,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { importPortfolioData } from "@/actions/settings";
import { AssetForm } from "@/components/assets/AssetForm";

export default function AddPage() {
  const t = useTranslations("add");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [assetFormOpen, setAssetFormOpen] = useState(false);
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
      setImportResult({ success: false, message: t("selectJsonFile") });
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
          message: t("importSuccess", { assets: assetsImported, transactions: transactionsImported }),
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

  const sections = [
    {
      title: t("addItems"),
      items: [
        {
          icon: Plus,
          label: t("addTransaction"),
          description: t("addTransactionDesc"),
          onClick: () => router.push("/add/transaction"),
          key: "addTransaction",
        },
        {
          icon: Landmark,
          label: t("addAsset"),
          description: t("addAssetDesc"),
          onClick: () => setAssetFormOpen(true),
          key: "addAsset",
        },
      ],
    },
    {
      title: t("addFromMyInvestor"),
      items: [
        {
          icon: Mail,
          label: t("importFromGmail"),
          description: t("importFromGmailDesc"),
          onClick: () => router.push("/import"),
          key: "importGmail",
        },
      ],
    },
    {
      title: t("addFromBackup"),
      items: [
        {
          icon: Upload,
          label: t("importFromJson"),
          description: t("importFromJsonDesc"),
          onClick: handleImportClick,
          key: "importJson",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <BackButton label={t("goBack")} />
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
        </div>
      </header>

      <main className="p-4 space-y-6">
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

        <AssetForm
          open={assetFormOpen}
          onOpenChange={setAssetFormOpen}
          onSuccess={() => router.push("/")}
        />

        {sections.map((section) => (
          <div key={section.title} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
              {section.title}
            </h2>
            {section.items.map((item) => (
              <button
                key={item.key}
                onClick={item.onClick}
                disabled={isImporting && item.key === "importJson"}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:bg-muted/50 active:scale-[0.98] transition-all text-left"
              >
                <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                  {isImporting && item.key === "importJson" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <item.icon className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ))}
      </main>
    </div>
  );
}
