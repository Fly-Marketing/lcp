"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveJobPrice } from "@/lib/pilot/actions";

export interface PriceHistoryView {
  oldPrice: number | null;
  newPrice: number;
  reason: string | null;
  changedAt: string;
  changedByName: string | null;
}

// Agreed price for one job, opened from Manager actions. Shows the new price, an optional reason, and the change history.
export function JobPriceDialog({
  jobId,
  price,
  priceHistory,
  open,
  onClose,
}: {
  jobId: string;
  price: number | null;
  priceHistory: PriceHistoryView[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState(price != null ? String(price) : "");
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function close() {
    setReason("");
    setValue(price != null ? String(price) : "");
    onClose();
  }

  function save() {
    startTransition(async () => {
      const r = await saveJobPrice(jobId, value, reason || null);
      if (!r.success) return void toast.error(r.message);
      toast.success("Price updated");
      close();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isPending && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update agreed price</DialogTitle>
          <DialogDescription>The change is logged with your name and reason.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="price">Price ($)</Label>
            <Input id="price" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea id="reason" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>

        {priceHistory.length > 0 ? (
          <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
            {priceHistory.map((h, i) => (
              <li key={i}>
                {new Date(h.changedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })} ·{" "}
                {h.oldPrice != null ? `$${h.oldPrice.toFixed(2)} → ` : ""}${h.newPrice.toFixed(2)}
                {h.changedByName ? ` · ${h.changedByName}` : ""}
                {h.reason ? ` · ${h.reason}` : ""}
              </li>
            ))}
          </ul>
        ) : null}

        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={close}>
            Cancel
          </Button>
          <Button disabled={isPending || value === ""} onClick={save}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save price
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
