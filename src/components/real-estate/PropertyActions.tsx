"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteProperty } from "@/actions/real-estate";

export function PropertyActions({ propertyId }: { propertyId: string }) {
  const t = useTranslations("realEstate");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      await deleteProperty(propertyId);
      router.push("/real-estate");
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/real-estate/${propertyId}/edit`}
        aria-label={t("edit")}
        className={buttonVariants({ variant: "outline", size: "icon" })}
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={tCommon("delete")}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteProperty")}</DialogTitle>
            <DialogDescription>{t("deleteConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
