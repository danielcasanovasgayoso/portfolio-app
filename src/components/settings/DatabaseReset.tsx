"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetDatabase } from "@/actions/settings";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

const CONFIRMATION_TEXT = "DELETE ALL DATA";

export function DatabaseReset() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmText === CONFIRMATION_TEXT;

  const handleReset = async () => {
    if (!isConfirmed) return;

    setIsLoading(true);
    setError(null);

    const result = await resetDatabase();

    if (result.success) {
      setOpen(false);
      setConfirmText("");
      router.push("/");
      router.refresh();
    } else {
      setError(result.error || "Failed to reset database");
    }

    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="destructive" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Reset Database
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Reset Database
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>All transactions</li>
            <li>All holdings</li>
            <li>All assets</li>
            <li>All price history</li>
            <li>Gmail import connection</li>
          </ul>

          <div className="mt-4 space-y-2">
            <Label htmlFor="confirm" className="text-sm">
              Type <code className="font-mono bg-muted px-1">{CONFIRMATION_TEXT}</code> to confirm
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type confirmation text"
              className="font-mono"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive mt-2">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={!isConfirmed || isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete Everything
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
