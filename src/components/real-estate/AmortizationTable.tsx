"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { ScheduleRow } from "@/services/mortgage.service";

const PER_PAGE = 12;

export function AmortizationTable({ schedule }: { schedule: ScheduleRow[] }) {
  const t = useTranslations("realEstate");

  // Default to the page containing the first pending installment.
  const firstPendingIdx = useMemo(
    () => schedule.findIndex((r) => r.status === "PENDING"),
    [schedule]
  );
  const initialPage =
    firstPendingIdx >= 0 ? Math.floor(firstPendingIdx / PER_PAGE) : 0;
  const [page, setPage] = useState(initialPage);

  const pageCount = Math.ceil(schedule.length / PER_PAGE);
  const rows = schedule.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>{t("date")}</TableHead>
              <TableHead className="text-right">{t("payment")}</TableHead>
              <TableHead className="text-right">{t("interest")}</TableHead>
              <TableHead className="text-right">{t("principal")}</TableHead>
              <TableHead className="text-right">{t("balance")}</TableHead>
              <TableHead className="text-center">{t("status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.index}>
                <TableCell className="text-muted-foreground">{row.index}</TableCell>
                <TableCell>{formatDate(row.paymentDate)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.payment)}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatCurrency(row.interest)}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(row.principal)}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(row.balance)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={row.status === "PAID" ? "growth" : "secondary"}>
                    {row.status === "PAID" ? t("paid") : t("pending")}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            {t("previous")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {page + 1} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={page >= pageCount - 1}
          >
            {t("next")}
          </Button>
        </div>
      )}
    </div>
  );
}
