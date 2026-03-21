"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createManualAsset,
  updateManualAsset,
  deleteManualAsset,
} from "@/actions/assets";

interface AssetFormValues {
  name: string;
  category: string;
  value: string;
}

interface AssetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editAsset?: {
    assetId: string;
    name: string;
    category: string;
    value: number;
  } | null;
}

const categoryKeys = ["OTHERS", "FUNDS", "STOCKS", "PP"] as const;

export function AssetForm({
  open,
  onOpenChange,
  onSuccess,
  editAsset,
}: AssetFormProps) {
  const t = useTranslations("assets");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const isEditing = !!editAsset;

  const categoryLabels: Record<string, string> = {
    OTHERS: t("categoryOthers"),
    FUNDS: t("categoryFunds"),
    STOCKS: t("categoryStocks"),
    PP: t("categoryPP"),
  };

  const form = useForm<AssetFormValues>({
    defaultValues: {
      name: editAsset?.name ?? "",
      category: editAsset?.category ?? "OTHERS",
      value: editAsset?.value?.toString() ?? "",
    },
  });

  // Reset form when editAsset changes
  if (open && editAsset) {
    const currentName = form.getValues("name");
    if (currentName !== editAsset.name) {
      form.reset({
        name: editAsset.name,
        category: editAsset.category,
        value: editAsset.value.toString(),
      });
    }
  }

  const onSubmit = (data: AssetFormValues) => {
    const value = parseFloat(data.value);
    if (isNaN(value) || value < 0) {
      form.setError("value", { message: t("invalidValue") });
      return;
    }

    startTransition(async () => {
      const result = isEditing
        ? await updateManualAsset(editAsset.assetId, {
            name: data.name,
            category: data.category as "OTHERS" | "FUNDS" | "STOCKS" | "PP",
            value,
          })
        : await createManualAsset({
            name: data.name,
            category: data.category as "OTHERS" | "FUNDS" | "STOCKS" | "PP",
            value,
          });

      if (result.success) {
        form.reset({ name: "", category: "OTHERS", value: "" });
        onOpenChange(false);
        onSuccess?.();
      } else {
        form.setError("root", { message: result.error });
      }
    });
  };

  const handleDelete = () => {
    if (!editAsset) return;
    startTransition(async () => {
      const result = await deleteManualAsset(editAsset.assetId);
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
            {isEditing ? t("editAsset") : t("addAsset")}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t("editDescription") : t("addDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: t("nameRequired") }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("namePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("category")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {categoryLabels[field.value] || t("selectCategory")}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoryKeys.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {categoryLabels[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="value"
              rules={{ required: t("valueRequired") }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("value")}</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}

            <DialogFooter className="gap-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  {tCommon("delete")}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? t("saveChanges") : t("addAsset")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
