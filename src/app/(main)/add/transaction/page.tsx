"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  TransactionCreateSchema,
  type TransactionCreateInput,
} from "@/lib/validators";
import { createTransaction, getAssets } from "@/actions/transactions";
import { TransactionFormFields } from "@/components/transactions/TransactionFormFields";
import type { Asset } from "@prisma/client";

export default function AddTransactionPage() {
  const t = useTranslations("transactions");
  const tAdd = useTranslations("add");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [assets, setAssets] = useState<
    Pick<Asset, "id" | "name" | "isin" | "ticker" | "category">[]
  >([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<TransactionCreateInput>({
    resolver: zodResolver(TransactionCreateSchema),
    defaultValues: {
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
    },
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

  useEffect(() => {
    getAssets().then((data) => {
      setAssets(data);
      setLoading(false);
    });
  }, []);

  const onSubmit = (data: TransactionCreateInput) => {
    startTransition(async () => {
      const result = await createTransaction(data);
      if (result.success) {
        router.push("/");
      } else {
        form.setError("root", { message: result.error });
      }
    });
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            aria-label={tAdd("goBack")}
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            {t("addTransaction")}
          </h1>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <TransactionFormFields form={form} assets={assets} />

              {form.formState.errors.root && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.root.message}
                </p>
              )}

              <Button
                type="submit"
                disabled={isPending}
                className="w-full"
              >
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("addTransaction")}
              </Button>
            </form>
          </Form>
        )}
      </main>
    </div>
  );
}
