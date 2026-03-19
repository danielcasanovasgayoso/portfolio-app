"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recalculateAllAssetHoldings } from "@/actions/holdings";

export function RecalculateHoldingsButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleRecalculate = () => {
    setResult(null);
    startTransition(async () => {
      const res = await recalculateAllAssetHoldings();
      if (res.success) {
        const { recalculated, errors } = res.data;
        if (errors.length > 0) {
          setResult({
            type: "error",
            message: `Recalculated ${recalculated} holdings with ${errors.length} errors`,
          });
        } else {
          setResult({
            type: "success",
            message: `Successfully recalculated ${recalculated} holdings`,
          });
        }
      } else {
        setResult({
          type: "error",
          message: res.error,
        });
      }
    });
  };

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        onClick={handleRecalculate}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        Recalculate Holdings
      </Button>
      {result && (
        <div
          className={`flex items-center gap-2 text-sm ${
            result.type === "success" ? "text-emerald-600" : "text-destructive"
          }`}
        >
          {result.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {result.message}
        </div>
      )}
    </div>
  );
}
