"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addPartialAmortization,
  deletePartialAmortization,
} from "@/actions/real-estate";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useActionError } from "@/lib/use-action-error";
import { DatePicker } from "@/components/real-estate/DatePicker";
import type { PartialAmortizationDto, AmortizationMode } from "@/types/real-estate";

const num = (v: string) => parseFloat(v.replace(",", ".")) || 0;

export function AmortizationsManager({
  propertyId,
  amortizations,
}: {
  propertyId: string;
  amortizations: PartialAmortizationDto[];
}) {
  const t = useTranslations("realEstate");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const translateError = useActionError();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<AmortizationMode>("REDUCE_TERM");
  const [error, setError] = useState<string | null>(null);

  const modeLabel = (m: AmortizationMode) =>
    m === "REDUCE_TERM" ? t("reduceTerm") : t("reduceInstallment");

  const handleAdd = () => {
    setError(null);
    startTransition(async () => {
      const result = await addPartialAmortization(propertyId, {
        date: new Date(date),
        amount: num(amount),
        mode,
      });
      if (result.success) {
        setAmount("");
        setOpen(false);
        router.refresh();
      } else {
        setError(translateError(result));
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deletePartialAmortization(id);
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {amortizations.length} {t("amortizations")}
        </span>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addAmortization")}
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("addAmortization")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t("date")}</Label>
                <DatePicker value={date} onChange={setDate} />
              </div>
              <div>
                <Label>{t("amount")} (€)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("amortizationMode")}</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as AmortizationMode)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{modeLabel(mode)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REDUCE_TERM">{t("reduceTerm")}</SelectItem>
                    <SelectItem value="REDUCE_INSTALLMENT">
                      {t("reduceInstallment")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {tCommon("cancel")}
              </Button>
              <Button onClick={handleAdd} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tCommon("save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {amortizations.length > 0 ? (
        <ul className="divide-y divide-border">
          {amortizations.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2">
              <div className="flex flex-col">
                <span className="text-sm">{formatDate(a.date)}</span>
                <span className="text-xs text-muted-foreground">{modeLabel(a.mode)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">{formatCurrency(a.amount)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(a.id)}
                  disabled={isPending}
                  aria-label={tCommon("delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noAmortizations")}</p>
      )}
    </div>
  );
}
