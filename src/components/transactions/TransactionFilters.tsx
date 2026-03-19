"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Asset } from "@prisma/client";
import type { TransactionType } from "@/types/transaction";

interface TransactionFiltersProps {
  assets: Pick<Asset, "id" | "name" | "isin" | "ticker" | "category">[];
}

const transactionTypes: { value: TransactionType; label: string }[] = [
  { value: "BUY", label: "Buy" },
  { value: "SELL", label: "Sell" },
  { value: "DIVIDEND", label: "Dividend" },
  { value: "FEE", label: "Fee" },
  { value: "TRANSFER", label: "Transfer" },
];

export function TransactionFilters({ assets }: TransactionFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTypes = searchParams.get("types")?.split(",").filter(Boolean) || [];
  const currentAssetId = searchParams.get("assetId") || "";
  const currentDateFrom = searchParams.get("dateFrom") || "";
  const currentDateTo = searchParams.get("dateTo") || "";

  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    currentDateFrom ? new Date(currentDateFrom) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    currentDateTo ? new Date(currentDateTo) : undefined
  );

  const updateFilters = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      // Reset to page 1 when filters change
      params.delete("page");

      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router]
  );

  const toggleType = (type: TransactionType) => {
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type];

    updateFilters({
      types: newTypes.length > 0 ? newTypes.join(",") : undefined,
    });
  };

  const handleAssetChange = (value: unknown) => {
    const assetId = value as string | null;
    updateFilters({ assetId: assetId || undefined });
  };

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    updateFilters({
      dateFrom: date ? format(date, "yyyy-MM-dd") : undefined,
    });
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    updateFilters({
      dateTo: date ? format(date, "yyyy-MM-dd") : undefined,
    });
  };

  const clearAllFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    router.push(pathname);
  };

  const hasFilters =
    currentTypes.length > 0 ||
    currentAssetId ||
    currentDateFrom ||
    currentDateTo;

  const selectedAsset = assets.find((a) => a.id === currentAssetId);

  return (
    <div className="space-y-4">
      {/* Type filters */}
      <div className="flex flex-wrap gap-2">
        {transactionTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => toggleType(type.value)}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-full border transition-colors",
              currentTypes.includes(type.value)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-accent"
            )}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Asset and Date filters */}
      <div className="flex flex-wrap gap-2">
        {/* Asset Select */}
        <Select value={currentAssetId} onValueChange={handleAssetChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All assets">
              {selectedAsset ? selectedAsset.name : "All assets"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All assets</SelectItem>
            {assets.map((asset) => (
              <SelectItem key={asset.id} value={asset.id}>
                {asset.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date From */}
        <Popover>
          <PopoverTrigger
            className={cn(
              "inline-flex items-center justify-start h-8 w-[140px] px-2.5 rounded-lg border border-input bg-transparent text-sm font-normal hover:bg-muted transition-colors",
              !dateFrom && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "From date"}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={handleDateFromChange}
            />
          </PopoverContent>
        </Popover>

        {/* Date To */}
        <Popover>
          <PopoverTrigger
            className={cn(
              "inline-flex items-center justify-start h-8 w-[140px] px-2.5 rounded-lg border border-input bg-transparent text-sm font-normal hover:bg-muted transition-colors",
              !dateTo && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateTo ? format(dateTo, "dd/MM/yyyy") : "To date"}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={handleDateToChange}
            />
          </PopoverContent>
        </Popover>

        {/* Clear filters */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-8"
          >
            <X className="h-4 w-4 mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Active filters summary */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {currentTypes.map((type) => (
            <Badge
              key={type}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => toggleType(type as TransactionType)}
            >
              {transactionTypes.find((t) => t.value === type)?.label || type}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
          {selectedAsset && (
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={() => handleAssetChange("")}
            >
              {selectedAsset.name}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          )}
          {dateFrom && (
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={() => handleDateFromChange(undefined)}
            >
              From: {format(dateFrom, "dd/MM/yyyy")}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          )}
          {dateTo && (
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={() => handleDateToChange(undefined)}
            >
              To: {format(dateTo, "dd/MM/yyyy")}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
