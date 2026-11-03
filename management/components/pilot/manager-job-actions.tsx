"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JobPriceDialog, type PriceHistoryView } from "@/components/pilot/job-price-dialog";
import { managerUpdateJob } from "@/lib/pilot/actions";
import { OVERRIDE_TAGS, type OverrideAction } from "@/lib/pilot/override-tags";

const selectCls = "h-9 w-full rounded-lg border border-input bg-background px-2 text-sm";

const CHOICES: Record<
  OverrideAction,
  { title: string; description: string; confirm: string; ok: string; commentRequired: boolean }
> = {
  reschedule: {
    title: "Reschedule this job",
    description: "Move the clean to a new date. The job shows on that day in the schedule.",
    confirm: "Reschedule",
    ok: "Job rescheduled",
    commentRequired: false,
  },
  markDone: {
    title: "Mark this job done",
    description: "The job is marked completed. Pick who cleaned it and why it was marked done manually.",
    confirm: "Mark done",
    ok: "Marked done",
    commentRequired: false,
  },
  archive: {
    title: "Archive this job",
    description: "The job is removed from the schedule and kept in the record. Say why it's being archived.",
    confirm: "Archive job",
    ok: "Job archived",
    commentRequired: true,
  },
};

// Bottom-of-job card: Update price for anyone who can edit it, and Mark done / Archive for managers.
// Each override opens a pop-up with a required reason tag, an optional cleaner (Mark done), and a comment.
export function ManagerJobActions({
  jobId,
  done,
  archived,
  checkoutDate,
  canOverride,
  canEditPrice,
  price,
  priceHistory,
  cleaners,
  assignedStaffId,
}: {
  jobId: string;
  done: boolean;
  archived: boolean;
  checkoutDate: string | null;
  canOverride: boolean;
  canEditPrice: boolean;
  price: number | null;
  priceHistory: PriceHistoryView[];
  cleaners: { staffId: string; name: string }[];
  assignedStaffId: string | null;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState<OverrideAction | null>(null);
  const [priceOpen, setPriceOpen] = useState(false);
  const [tag, setTag] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState("");
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();

  const current = choice ? CHOICES[choice] : null;
  const tags = choice ? OVERRIDE_TAGS[choice] : [];
  const missingComment = !!current?.commentRequired && comment.trim() === "";
  const missingDate = choice === "reschedule" && (date === "" || date === checkoutDate);
  const canConfirm = !isPending && tag !== "" && !missingComment && !missingDate;

  function open(next: OverrideAction) {
    setTag("");
    setStaffId(assignedStaffId ?? "");
    setDate(checkoutDate ?? "");
    setComment("");
    setChoice(next);
  }

  function close() {
    setChoice(null);
    setTag("");
    setComment("");
  }

  function confirm() {
    if (!choice || !current) return;
    startTransition(async () => {
      const changedCleaner = staffId !== "" && staffId !== (assignedStaffId ?? "");
      const patch =
        choice === "markDone"
          ? { markDone: true, assignStaffId: changedCleaner ? staffId : undefined }
          : choice === "reschedule"
            ? { reschedule: date }
            : { archive: true };
      const r = await managerUpdateJob(jobId, { ...patch, tag, comment });
      if (!r.success) return void toast.error(r.message);
      toast.success(current.ok);
      close();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-semibold">Manager actions</p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-2">
        {canEditPrice ? (
          <Button variant="outline" className="w-full" onClick={() => setPriceOpen(true)}>
            Update price
          </Button>
        ) : null}
        {canOverride ? (
          <>
            <Button variant="outline" className="w-full" disabled={done || archived} onClick={() => open("markDone")}>
              Mark done
            </Button>
            <Button variant="outline" className="w-full" disabled={done || archived} onClick={() => open("reschedule")}>
              Reschedule
            </Button>
            <Button variant="destructive" className="w-full" disabled={archived} onClick={() => open("archive")}>
              Archive
            </Button>
          </>
        ) : null}
      </div>

      {canEditPrice ? (
        <JobPriceDialog
          jobId={jobId}
          price={price}
          priceHistory={priceHistory}
          open={priceOpen}
          onClose={() => setPriceOpen(false)}
        />
      ) : null}

      <Dialog open={choice !== null} onOpenChange={(next) => !next && !isPending && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{current?.title}</DialogTitle>
            <DialogDescription>{current?.description}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {choice === "markDone" ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="override-cleaner">Cleaned by (optional)</Label>
                <select
                  id="override-cleaner"
                  className={selectCls}
                  value={staffId}
                  disabled={isPending}
                  onChange={(e) => setStaffId(e.target.value)}
                >
                  <option value="">Not assigned</option>
                  {cleaners.map((c) => (
                    <option key={c.staffId} value={c.staffId}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {choice === "reschedule" ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="override-date">New date</Label>
                <input
                  id="override-date"
                  type="date"
                  className={selectCls}
                  value={date}
                  disabled={isPending}
                  onChange={(e) => setDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Currently {checkoutDate ?? "not set"}</p>
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label htmlFor="override-tag">Reason</Label>
              <select
                id="override-tag"
                className={selectCls}
                value={tag}
                disabled={isPending}
                onChange={(e) => setTag(e.target.value)}
              >
                <option value="">Choose a reason</option>
                {tags.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="override-comment">Comment{current?.commentRequired ? "" : " (optional)"}</Label>
              <Textarea
                id="override-comment"
                rows={4}
                maxLength={500}
                placeholder={current?.commentRequired ? "Why is this job being archived?" : "Add details"}
                value={comment}
                disabled={isPending}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={isPending} onClick={close}>
              Cancel
            </Button>
            <Button variant={choice === "archive" ? "destructive" : "default"} disabled={!canConfirm} onClick={confirm}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {current?.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
