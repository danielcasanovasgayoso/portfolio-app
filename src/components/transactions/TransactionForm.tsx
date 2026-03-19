"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  TransactionCreateSchema,
  type TransactionCreateInput,
} from "@/lib/validators";
import { createTransaction, updateTransaction } from "@/actions/transactions";
import type { SerializedTransaction } from "@/types/transaction";
import type { Asset } from "@prisma/client";

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: SerializedTransaction | null;
  assets: Pick<Asset, "id" | "name" | "isin" | "ticker" | "category">[];
  onSuccess?: () => void;
}

const transactionTypes = [
  { value: "BUY", label: "Buy" },
  { value: "SELL", label: "Sell" },
  { value: "DIVIDEND", label: "Dividend" },
  { value: "FEE", label: "Fee" },
  { value: "TRANSFER", label: "Transfer" },
] as const;

const transferTypes = [
  { value: "IN", label: "Transfer In" },
  { value: "OUT", label: "Transfer Out" },
] as const;

export function TransactionForm({
  open,
  onOpenChange,
  transaction,
  assets,
  onSuccess,
}: TransactionFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!transaction;

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
    },
  });

  const watchedType = form.watch("type");

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
      });
    } else {
      form.reset({
        assetId: "",
        type: "BUY",
        date: new Date(),
        shares: "",
        pricePerShare: "",
        totalAmount: "",
        fees: "",
        transferType: undefined,
      });
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
            {isEditing ? "Edit Transaction" : "Add Transaction"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the transaction details below."
              : "Enter the details for the new transaction."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Asset */}
            <FormField
              control={form.control}
              name="assetId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset</FormLabel>
                  {assets.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      No assets available.
                    </p>
                  ) : (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select an asset">
                            {assets.find((a) => a.id === field.value)?.name ||
                              "Select an asset"}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assets.map((asset) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type and Transfer Type */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {transactionTypes.find(
                              (t) => t.value === field.value
                            )?.label || "Select type"}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {transactionTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedType === "TRANSFER" && (
                <FormField
                  control={form.control}
                  name="transferType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Direction</FormLabel>
                      <Select
                        value={field.value || ""}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {transferTypes.find(
                                (t) => t.value === field.value
                              )?.label || "Select direction"}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {transferTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <FormControl>
                      <PopoverTrigger
                        className={cn(
                          "inline-flex items-center justify-between w-full h-8 px-2.5 rounded-lg border border-input bg-transparent text-sm font-normal hover:bg-muted transition-colors",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="h-4 w-4 opacity-50" />
                      </PopoverTrigger>
                    </FormControl>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Shares and Price per Share */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="shares"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shares</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.0000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pricePerShare"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per Share</FormLabel>
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
            </div>

            {/* Total Amount and Fees */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Amount</FormLabel>
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

              <FormField
                control={form.control}
                name="fees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fees</FormLabel>
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
            </div>

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
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Add Transaction"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
