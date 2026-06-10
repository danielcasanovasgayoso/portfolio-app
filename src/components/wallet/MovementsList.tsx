"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteCashMovement } from "@/actions/wallet";
import { MovementForm } from "./MovementForm";
import type { SerializedCashMovement } from "@/services/wallet.service";

interface MovementsListProps {
  movements: SerializedCashMovement[];
}

export function MovementsList({ movements }: MovementsListProps) {
  const t = useTranslations("wallet");
  const router = useRouter();
  const [editing, setEditing] = useState<SerializedCashMovement | null>(null);
  const [deleting, setDeleting] = useState<SerializedCashMovement | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteCashMovement(deleting.id);
      if (result.success) {
        setDeleting(null);
        router.refresh();
      }
    });
  };

  return (
    <>
      <ul className="flex flex-col gap-3">
        {movements.map((m, index) => {
          const isDeposit = m.type === "DEPOSIT";
          return (
            <li
              key={m.id}
              className="relative bg-card rounded-xl shadow-sm px-4 py-3 overflow-hidden motion-safe:animate-fade-up"
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              <div
                className={cn(
                  "absolute left-0 top-0 bottom-0 w-[3px]",
                  isDeposit ? "bg-gain" : "bg-loss"
                )}
              />
              <div className="flex items-center gap-3 pl-1.5">
                {isDeposit ? (
                  <ArrowDownCircle className="h-5 w-5 shrink-0 text-gain" />
                ) : (
                  <ArrowUpCircle className="h-5 w-5 shrink-0 text-loss" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {m.note || (isDeposit ? t("deposit") : t("withdrawal"))}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {formatDate(m.date)}
                  </p>
                </div>
                <p
                  className={cn(
                    "font-mono font-bold tabular-nums text-sm sensitive-amount shrink-0",
                    isDeposit ? "text-gain" : "text-loss"
                  )}
                >
                  {isDeposit ? "+" : "−"}
                  {formatCurrency(m.amount)}
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={t("edit")}
                    className="inline-flex shrink-0 items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(m)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {t("edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleting(m)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          );
        })}
      </ul>

      <MovementForm
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        movement={editing}
        onSuccess={() => router.refresh()}
      />

      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
            <DialogDescription>{t("deleteConfirm")}</DialogDescription>
          </DialogHeader>
          {deleting && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm flex justify-between">
              <span>{formatDate(deleting.date)}</span>
              <span
                className={cn(
                  "font-mono font-semibold",
                  deleting.type === "DEPOSIT" ? "text-gain" : "text-loss"
                )}
              >
                {deleting.type === "DEPOSIT" ? "+" : "−"}
                {formatCurrency(deleting.amount)}
              </span>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
