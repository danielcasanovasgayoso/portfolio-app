"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "idle" | "syncing" | "success" | "error";

export function RefreshPricesButton() {
  const t = useTranslations("portfolio");
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");

  const handleRefresh = useCallback(async () => {
    if (status === "syncing") return;

    setStatus("syncing");

    try {
      const response = await fetch("/api/prices/refresh", { method: "POST" });

      if (!response.ok) {
        throw new Error("Failed to trigger refresh");
      }

      // Wait for background work to complete latest prices, then refresh page
      setTimeout(() => {
        router.refresh();
        setStatus("success");
        setTimeout(() => setStatus("idle"), 5000);
      }, 4000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 5000);
    }
  }, [status, router]);

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={status === "syncing"}
        className={cn(
          "gap-2 h-8 px-3 rounded-lg border-border font-mono text-xs uppercase tracking-wider",
          "transition-all duration-300",
          "hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
          status === "syncing" && "border-primary bg-primary/10 text-primary"
        )}
      >
        <RefreshCw
          className={cn("h-3.5 w-3.5", status === "syncing" && "animate-spin")}
        />
        <span className="hidden sm:inline">
          {status === "syncing" ? t("syncing") : t("refresh")}
        </span>
      </Button>

      {status === "success" && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gain-muted">
          <Check className="h-3 w-3 text-gain" />
          <span className="text-[10px] font-mono text-gain uppercase tracking-wider">
            {t("synced")}
          </span>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-loss-muted">
          <AlertCircle className="h-3 w-3 text-loss" />
          <span className="text-[10px] font-mono text-loss uppercase tracking-wider">
            {t("error")}
          </span>
        </div>
      )}
    </div>
  );
}
