"use client";

import { useState } from "react";
import { ImportStepFetch } from "./ImportStepFetch";
import { ImportStepPreview } from "./ImportStepPreview";
import { ImportStepConfirm } from "./ImportStepConfirm";
import type { ImportBatchSummary, ImportPreviewItem, ImportResult } from "@/types/import";

type ImportStep = "fetch" | "preview" | "confirm";

interface ImportWizardProps {
  canFetch: boolean;
}

export function ImportWizard({ canFetch }: ImportWizardProps) {
  const [step, setStep] = useState<ImportStep>("fetch");
  const [batchId, setBatchId] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportBatchSummary | null>(null);
  const [previewItems, setPreviewItems] = useState<ImportPreviewItem[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFetchComplete = (
    newBatchId: string,
    newSummary: ImportBatchSummary,
    items: ImportPreviewItem[]
  ) => {
    setBatchId(newBatchId);
    setSummary(newSummary);
    setPreviewItems(items);
    setStep("preview");
  };

  const handlePreviewConfirm = (selectedIds: string[]) => {
    // Store selected IDs for confirmation step
    setPreviewItems((items) =>
      items.map((item) => ({
        ...item,
        isSelected: selectedIds.includes(item.id),
      }))
    );
    setStep("confirm");
  };

  const handleImportComplete = (result: ImportResult) => {
    setImportResult(result);
  };

  const handleReset = () => {
    setStep("fetch");
    setBatchId(null);
    setSummary(null);
    setPreviewItems([]);
    setImportResult(null);
  };

  const handleBack = () => {
    if (step === "preview") {
      setStep("fetch");
    } else if (step === "confirm") {
      setStep("preview");
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        <StepIndicator
          step={1}
          label="Fetch"
          isActive={step === "fetch"}
          isComplete={step !== "fetch"}
        />
        <div className="h-px w-8 bg-border" />
        <StepIndicator
          step={2}
          label="Preview"
          isActive={step === "preview"}
          isComplete={step === "confirm"}
        />
        <div className="h-px w-8 bg-border" />
        <StepIndicator
          step={3}
          label="Import"
          isActive={step === "confirm"}
          isComplete={!!importResult}
        />
      </div>

      {/* Step content */}
      {step === "fetch" && (
        <ImportStepFetch
          canFetch={canFetch}
          onComplete={handleFetchComplete}
        />
      )}

      {step === "preview" && batchId && summary && (
        <ImportStepPreview
          batchId={batchId}
          summary={summary}
          items={previewItems}
          onConfirm={handlePreviewConfirm}
          onBack={handleBack}
          onCancel={handleReset}
        />
      )}

      {step === "confirm" && batchId && (
        <ImportStepConfirm
          batchId={batchId}
          selectedItems={previewItems.filter((i) => i.isSelected)}
          onComplete={handleImportComplete}
          onBack={handleBack}
          result={importResult}
          onReset={handleReset}
        />
      )}
    </div>
  );
}

function StepIndicator({
  step,
  label,
  isActive,
  isComplete,
}: {
  step: number;
  label: string;
  isActive: boolean;
  isComplete: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
          isComplete
            ? "bg-primary text-primary-foreground"
            : isActive
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {isComplete ? "✓" : step}
      </div>
      <span
        className={`text-sm ${
          isActive ? "font-medium" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
