"use client";

import { useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CashMovementInputSchema,
  type CashMovementInput,
} from "@/lib/validators";
import { updateCashMovement } from "@/actions/wallet";
import { useActionError } from "@/lib/use-action-error";
import { MovementFormFields } from "./MovementFormFields";
import type { SerializedCashMovement } from "@/services/wallet.service";

interface MovementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movement: SerializedCashMovement | null;
  onSuccess?: () => void;
}

/** Edit dialog for an existing wallet movement. Creation uses /wallet/new. */
export function MovementForm({
  open,
  onOpenChange,
  movement,
  onSuccess,
}: MovementFormProps) {
  const t = useTranslations("wallet");
  const translateError = useActionError();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CashMovementInput>({
    resolver: zodResolver(CashMovementInputSchema),
    defaultValues: {
      type: "DEPOSIT",
      date: new Date(),
      amount: "",
      note: "",
    },
  });

  useEffect(() => {
    if (movement) {
      form.reset({
        type: movement.type,
        date: new Date(movement.date),
        amount: String(movement.amount),
        note: movement.note ?? "",
      });
    }
  }, [movement, form]);

  const onSubmit = (data: CashMovementInput) => {
    if (!movement) return;
    // Pin the calendar's local-midnight Date to UTC midnight of the same
    // calendar day so the server doesn't shift it a day back.
    const d = data.date;
    const payload = {
      ...data,
      date: new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())),
    };
    startTransition(async () => {
      const result = await updateCashMovement(movement.id, payload);
      if (result.success) {
        onOpenChange(false);
        onSuccess?.();
      } else {
        form.setError("root", { message: translateError(result) });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editMovement")}</DialogTitle>
          <DialogDescription>{t("editDescription")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <MovementFormFields form={form} />

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
                {t("saveChanges")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
