"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addValuation, deleteValuation } from "@/actions/real-estate";
import { DatePicker } from "@/components/real-estate/DatePicker";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useActionError } from "@/lib/use-action-error";
import type { PropertyValuationDto } from "@/types/real-estate";

const num = (v: string) => parseFloat(v.replace(",", ".")) || 0;

export function ValuationsManager({
  propertyId,
  valuations,
}: {
  propertyId: string;
  valuations: PropertyValuationDto[];
}) {
  const t = useTranslations("realEstate");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const translateError = useActionError();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    setError(null);
    startTransition(async () => {
      const result = await addValuation(propertyId, {
        date: new Date(date),
        value: num(value),
      });
      if (result.success) {
        setValue("");
        setOpen(false);
        router.refresh();
      } else {
        setError(translateError(result));
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteValuation(id);
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {valuations.length} {t("valuations")}
        </span>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addValuation")}
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("addValuation")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t("date")}</Label>
                <DatePicker value={date} onChange={setDate} />
              </div>
              <div>
                <Label>{t("marketValue")} (€)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
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

      {valuations.length > 0 ? (
        <ul className="divide-y divide-border">
          {[...valuations].reverse().map((v) => (
            <li key={v.id} className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">{formatDate(v.date)}</span>
              <div className="flex items-center gap-3">
                <span className="font-medium">{formatCurrency(v.value)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(v.id)}
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
        <p className="text-sm text-muted-foreground">{t("noValuations")}</p>
      )}
    </div>
  );
}
