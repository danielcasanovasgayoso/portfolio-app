"use client";

import { useState, useTransition } from "react";
import { Tags, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recategorizeAllAssets } from "@/actions/assets";

export function RecategorizeAssetsButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
    details?: { name: string; from: string; to: string }[];
  } | null>(null);

  const handleRecategorize = () => {
    setResult(null);
    startTransition(async () => {
      const res = await recategorizeAllAssets();
      if (res.success) {
        const { updated, details } = res.data;
        if (updated === 0) {
          setResult({
            type: "success",
            message: "All assets are already correctly categorized",
          });
        } else {
          setResult({
            type: "success",
            message: `Updated ${updated} asset categories`,
            details,
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
        onClick={handleRecategorize}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Tags className="mr-2 h-4 w-4" />
        )}
        Recategorize Assets
      </Button>
      {result && (
        <div className="space-y-1">
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
          {result.details && result.details.length > 0 && (
            <ul className="text-xs text-muted-foreground pl-6 space-y-0.5">
              {result.details.map((d, i) => (
                <li key={i}>
                  {d.name}: {d.from} → {d.to}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
