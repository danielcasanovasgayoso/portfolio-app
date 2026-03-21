"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
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

const categories = [
  { value: "OTHERS", label: "Others" },
  { value: "FUNDS", label: "Funds" },
  { value: "STOCKS", label: "Stocks" },
  { value: "PP", label: "Pension Plan" },
] as const;

export function AssetForm({
  open,
  onOpenChange,
  onSuccess,
  editAsset,
}: AssetFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!editAsset;

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
      form.setError("value", { message: "Enter a valid positive number" });
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
            {isEditing ? "Edit Asset" : "Add Asset"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the asset details below."
              : "Add a manual asset like cash, real estate, or other holdings."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: "Name is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Emergency Fund, Apartment Madrid"
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
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {categories.find((c) => c.value === field.value)
                            ?.label || "Select category"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
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
              rules={{ required: "Value is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Value</FormLabel>
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
                  Delete
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Add Asset"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
