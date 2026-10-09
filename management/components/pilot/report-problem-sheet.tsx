"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reportIssue } from "@/lib/pilot/actions";

export function ReportProblemSheet({
  jobId,
  staffId,
  unitLabel,
  open,
  onOpenChange,
}: {
  jobId: string;
  staffId: string;
  unitLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [description, setDescription] = useState("");

  function handleSubmit() {
    if (!description.trim()) return;
    startTransition(async () => {
      const result = await reportIssue(jobId, staffId, description);
      if (!result.success) {
        toast.error(result.message ?? "Failed to submit report");
        return;
      }
      toast.success("Report submitted");
      setDescription("");
      onOpenChange(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Report a problem</SheetTitle>
          <SheetDescription>{unitLabel}</SheetDescription>
        </SheetHeader>

        <div className="px-4">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's wrong?"
            rows={4}
            autoFocus
          />
        </div>

        <SheetFooter>
          <Button disabled={isPending || !description.trim()} onClick={handleSubmit}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Submit report
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
