"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SSEEvent } from "@/types/price-refresh";

type Status = "idle" | "syncing" | "success" | "error";

export function RefreshPricesButton() {
  const t = useTranslations("portfolio");
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState({ updated: 0, total: 0 });
  const eventSourceRef = useRef<EventSource | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up EventSource and timers on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, []);

  const debouncedRefresh = useCallback(() => {
    if (refreshTimerRef.current) return;
    refreshTimerRef.current = setTimeout(() => {
      router.refresh();
      refreshTimerRef.current = null;
    }, 500);
  }, [router]);

  const handleRefresh = useCallback(() => {
    if (status === "syncing") return;

    setStatus("syncing");
    setProgress({ updated: 0, total: 0 });

    const es = new EventSource("/api/prices/refresh/stream");
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const data: SSEEvent = JSON.parse(event.data);

      switch (data.type) {
        case "start":
          setProgress((prev) => ({ ...prev, total: data.total }));
          break;

        case "price_updated":
          setProgress((prev) => ({ ...prev, updated: prev.updated + 1 }));
          debouncedRefresh();
          break;

        case "price_error":
          setProgress((prev) => ({ ...prev, updated: prev.updated + 1 }));
          break;

        case "done":
          es.close();
          eventSourceRef.current = null;
          router.refresh();
          setStatus(data.errors > 0 && data.updated === 0 ? "error" : "success");
          statusTimerRef.current = setTimeout(() => setStatus("idle"), 5000);
          break;
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setStatus("error");
      statusTimerRef.current = setTimeout(() => setStatus("idle"), 5000);
    };
  }, [status, router, debouncedRefresh]);

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
          {status === "syncing"
            ? progress.total > 0
              ? t("updatingCount", { updated: progress.updated, total: progress.total })
              : t("syncing")
            : t("refresh")}
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
