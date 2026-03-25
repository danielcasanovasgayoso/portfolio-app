"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import {
  TransactionCreateSchema,
  type TransactionCreateInput,
} from "@/lib/validators";
import { createTransaction, updateTransaction } from "@/actions/transactions";
import { TransactionFormFields } from "./TransactionFormFields";
import type { SerializedTransaction } from "@/types/transaction";
import type { Asset } from "@prisma/client";

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: SerializedTransaction | null;
  assets: Pick<Asset, "id" | "name" | "isin" | "ticker" | "category">[];
  onSuccess?: () => void;
}

const defaultValues: TransactionCreateInput = {
  assetId: "",
  type: "BUY",
  date: new Date(),
  shares: "",
  pricePerShare: "",
  totalAmount: "",
  fees: "",
  transferType: undefined,
  newAssetName: "",
  newAssetIsin: "",
  newAssetCategory: "OTHERS",
};

export function TransactionForm({
  open,
  onOpenChange,
  transaction,
  assets,
  onSuccess,
}: TransactionFormProps) {
  const t = useTranslations("transactions");
  const [isPending, startTransition] = useTransition();
  const isEditing = !!transaction;

  const form = useForm<TransactionCreateInput>({
    resolver: zodResolver(TransactionCreateSchema),
    defaultValues,
  });

  const watchedShares = form.watch("shares");
  const watchedPricePerShare = form.watch("pricePerShare");
  const watchedFees = form.watch("fees");

  // Auto-calculate total amount from shares * pricePerShare + fees
  useEffect(() => {
    const shares = parseFloat(watchedShares);
    const price = parseFloat(watchedPricePerShare || "");
    if (!isNaN(shares) && !isNaN(price)) {
      const fees = parseFloat(watchedFees || "") || 0;
      const total = (shares * price + fees).toFixed(2);
      form.setValue("totalAmount", total);
    }
  }, [watchedShares, watchedPricePerShare, watchedFees, form]);

  // Reset form when transaction changes
  useEffect(() => {
    if (transaction) {
      form.reset({
        assetId: transaction.assetId,
        type: transaction.type,
        date: new Date(transaction.date),
        shares: String(transaction.shares),
        pricePerShare: transaction.pricePerShare
          ? String(transaction.pricePerShare)
          : "",
        totalAmount: String(transaction.totalAmount),
        fees: transaction.fees ? String(transaction.fees) : "",
        transferType: transaction.transferType || undefined,
        newAssetName: "",
        newAssetIsin: "",
        newAssetCategory: "OTHERS",
      });
    } else {
      form.reset(defaultValues);
    }
  }, [transaction, form]);

  const onSubmit = (data: TransactionCreateInput) => {
    startTransition(async () => {
      const result = isEditing
        ? await updateTransaction(transaction.id, data)
        : await createTransaction(data);

      if (result.success) {
        onOpenChange(false);
        onSuccess?.();
      } else {
        form.setError("root", { message: result.error });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("editTransaction") : t("addTransaction")}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t("editDescription") : t("addDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <TransactionFormFields form={form} assets={assets} />

            {form.formState.errors.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? t("saveChanges") : t("addTransaction")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
