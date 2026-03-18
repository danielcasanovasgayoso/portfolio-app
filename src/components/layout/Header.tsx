"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title?: string;
  onRefresh?: () => Promise<void>;
}

export function Header({ title = "Portfolio", onRefresh }: HeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing || !onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border px-5 py-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-10 w-10 bg-primary/10 hover:bg-primary/20 text-primary"
            aria-label="Refresh prices"
          >
            <RefreshCw
              className={cn("h-5 w-5", isRefreshing && "animate-spin")}
            />
          </Button>
        )}
      </div>
    </header>
  );
}
