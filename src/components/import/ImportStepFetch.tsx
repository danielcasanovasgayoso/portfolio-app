"use client";

import { useState } from "react";
import { format, subMonths } from "date-fns";
import { Calendar as CalendarIcon, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  fetchGmailTransactions,
  getImportPreview,
} from "@/actions/import";
import type { ImportBatchSummary, ImportPreviewItem } from "@/types/import";

interface ImportStepFetchProps {
  canFetch: boolean;
  onComplete: (
    batchId: string,
    summary: ImportBatchSummary,
    items: ImportPreviewItem[]
  ) => void;
}

export function ImportStepFetch({ canFetch, onComplete }: ImportStepFetchProps) {
  const [afterDate, setAfterDate] = useState<Date | undefined>(
    subMonths(new Date(), 3)
  );
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    setIsFetching(true);
    setError(null);

    const result = await fetchGmailTransactions({
      afterDate,
      maxResults: 200,
    });

    if (!result.success) {
      setError(result.error);
      setIsFetching(false);
      return;
    }

    // Get preview items
    const previewResult = await getImportPreview(result.data.batchId);

    if (!previewResult.success) {
      setError(previewResult.error);
      setIsFetching(false);
      return;
    }

    setIsFetching(false);
    onComplete(result.data.batchId, result.data.summary, previewResult.data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Fetch Emails
        </CardTitle>
        <CardDescription>
          Fetch transaction emails from your Gmail account. Only emails from
          notificaciones@myinvestor.es will be processed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canFetch ? (
          <div className="rounded-md bg-yellow-50 p-4 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
            Please connect your Gmail account first to fetch emails.
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Import emails after date (optional)</Label>
              <Popover>
                <PopoverTrigger className="flex h-10 w-full items-center justify-start rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {afterDate ? (
                    format(afterDate, "PPP")
                  ) : (
                    <span className="text-muted-foreground">All time</span>
                  )}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={afterDate}
                    onSelect={setAfterDate}
                    initialFocus
                  />
                  {afterDate && (
                    <div className="border-t p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setAfterDate(undefined)}
                      >
                        Clear date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Leave empty to import all available emails, or select a date to
                only import emails after that date.
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-4 text-destructive">
                {error}
              </div>
            )}

            <Button
              onClick={handleFetch}
              disabled={isFetching}
              className="w-full"
            >
              {isFetching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching emails...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Fetch Emails
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
