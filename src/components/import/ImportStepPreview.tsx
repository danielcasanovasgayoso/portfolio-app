"use client";

import { useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, ArrowLeft, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatShares } from "@/lib/formatters";
import { cancelImport } from "@/actions/import";
import type { ImportBatchSummary, ImportPreviewItem } from "@/types/import";

interface ImportStepPreviewProps {
  batchId: string;
  summary: ImportBatchSummary;
  items: ImportPreviewItem[];
  onConfirm: (selectedIds: string[]) => void;
  onBack: () => void;
  onCancel: () => void;
}

export function ImportStepPreview({
  batchId,
  summary,
  items,
  onConfirm,
  onBack,
  onCancel,
}: ImportStepPreviewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(items.filter((i) => !i.isDuplicate).map((i) => i.id))
  );

  const toggleItem = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === items.filter((i) => !i.isDuplicate).length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.filter((i) => !i.isDuplicate).map((i) => i.id)));
    }
  };

  const handleCancel = async () => {
    await cancelImport(batchId);
    onCancel();
  };

  const validItems = items.filter((i) => !i.isDuplicate);
  const allSelected = selectedIds.size === validItems.length && validItems.length > 0;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Import Preview</CardTitle>
          <CardDescription>
            Review the transactions before importing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <div className="text-2xl font-bold">{summary.totalEmails}</div>
              <div className="text-sm text-muted-foreground">Emails fetched</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-2xl font-bold text-green-600">
                {summary.validTransactions}
              </div>
              <div className="text-sm text-muted-foreground">
                New transactions
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-2xl font-bold text-yellow-600">
                {summary.duplicateTransactions}
              </div>
              <div className="text-sm text-muted-foreground">Duplicates</div>
            </div>
          </div>

          {summary.errors.length > 0 && (
            <div className="mt-4 rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">
                  {summary.errors.length} email(s) could not be parsed
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                {summary.errors.map((err, idx) => (
                  <li key={idx} className="truncate">
                    <span className="font-medium">{err.subject?.slice(0, 50)}...</span>
                    <br />
                    <span className="text-xs opacity-75">{err.error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction list */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions to Import</CardTitle>
          <CardDescription>
            {selectedIds.size} of {validItems.length} selected
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No transactions found in the fetched emails.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow
                      key={item.id}
                      className={item.isDuplicate ? "opacity-50" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleItem(item.id)}
                          disabled={item.isDuplicate}
                          aria-label={`Select ${item.transaction.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        {format(new Date(item.transaction.date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTypeVariant(item.transaction.type)}>
                          {item.transaction.type}
                          {item.transaction.transferType &&
                            ` (${item.transaction.transferType})`}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium truncate max-w-[200px]">
                            {item.transaction.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.transaction.isin}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatShares(item.transaction.shares)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.transaction.totalAmount)}
                      </TableCell>
                      <TableCell>
                        {item.isDuplicate ? (
                          <Badge variant="outline" className="text-yellow-600">
                            Duplicate
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600">
                            New
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button variant="ghost" onClick={handleCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
        <Button
          onClick={() => onConfirm(Array.from(selectedIds))}
          disabled={selectedIds.size === 0}
        >
          <Check className="mr-2 h-4 w-4" />
          Import {selectedIds.size} Transaction{selectedIds.size !== 1 ? "s" : ""}
        </Button>
      </div>
    </div>
  );
}

function getTypeVariant(
  type: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (type) {
    case "BUY":
      return "default";
    case "SELL":
      return "destructive";
    case "DIVIDEND":
      return "secondary";
    default:
      return "outline";
  }
}
