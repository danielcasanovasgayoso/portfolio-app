"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Loader2,
  Mail,
  Plus,
  Upload,
  type LucideIcon,
} from "lucide-react";
import {
  HeroBackdrop,
  MobileShell,
  PageHeader,
  SettingsRow,
  SettingsSection,
} from "@/components/pulse";
import { importPortfolioData } from "@/actions/settings";

export default function AddPage() {
  const t = useTranslations("add");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleImportClick = () => fileInputRef.current?.click();

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
          message: t("importSuccess", {
            assets: assetsImported,
            transactions: transactionsImported,
          }),
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
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => setImportResult(null), 5000);
    }
  };

  return (
    <MobileShell>
      <HeroBackdrop height={160} orbits="right" />
      <div className="relative px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <PageHeader title={t("title")} backLabel={t("goBack")} backHref="/" />

        <input
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          ref={fileInputRef}
          className="hidden"
        />

        {importResult && (
          <div
            className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] ${
              importResult.success
                ? "bg-gain-muted text-gain"
                : "bg-loss-muted text-loss"
            }`}
            role="status"
          >
            {importResult.success ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{importResult.message}</span>
          </div>
        )}

        <SettingsSection title={t("addItems")}>
          <SettingsRow
            icon={Plus}
            title={t("addTransaction")}
            sub={t("addTransactionDesc")}
            href="/add/transaction"
            last
          />
        </SettingsSection>

        <SettingsSection title={t("addFromMyInvestor")}>
          <SettingsRow
            icon={Mail}
            title={t("importFromGmail")}
            sub={t("importFromGmailDesc")}
            href="/import"
            last
          />
        </SettingsSection>

        <SettingsSection title={t("addFromBackup")}>
          <ImportFromJsonRow
            label={t("importFromJson")}
            description={t("importFromJsonDesc")}
            isImporting={isImporting}
            onClick={handleImportClick}
          />
        </SettingsSection>
      </div>
    </MobileShell>
  );
}

function ImportFromJsonRow({
  label,
  description,
  isImporting,
  onClick,
}: {
  label: string;
  description: string;
  isImporting: boolean;
  onClick: () => void;
}) {
  const Icon: LucideIcon = isImporting ? Loader2 : Upload;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isImporting}
      className="block w-full text-left transition-colors hover:bg-muted/40 active:bg-muted/60 disabled:opacity-60"
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/[0.12] text-primary">
          <Icon className={`h-4 w-4 ${isImporting ? "animate-spin" : ""}`} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-foreground">
            {label}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            {description}
          </span>
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </button>
  );
}
