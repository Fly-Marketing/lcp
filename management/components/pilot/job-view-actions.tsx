"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { acceptJob, reportIssue } from "@/lib/pilot/actions";
import type { PilotJob } from "@/lib/pilot/types";

export function JobViewActions({ token, job, staffId }: { token: string; job: PilotJob; staffId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"accept" | "report" | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleAccept() {
    setError(null);
    setPendingAction("accept");
    startTransition(async () => {
      const result = await acceptJob(job.id);
      if (!result.success) {
        const message = result.message ?? "Failed to accept job";
        setError(message);
        toast.error(message);
        return;
      }
      toast.success("Job accepted");
      router.refresh();
    });
  }

  function handleReport() {
    if (!description.trim()) return;
    setError(null);
    setPendingAction("report");
    startTransition(async () => {
      const result = await reportIssue(job.id, staffId, description);
      if (!result.success) {
        const message = result.message ?? "Failed to submit report";
        setError(message);
        toast.error(message);
        return;
      }
      setDescription("");
      setShowReport(false);
      toast.success("Report submitted");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-col gap-2">
        {job.status === "Open" || job.status === "Upcoming" || job.status === "Ready" ? (
          <Button size="lg" disabled={isPending} onClick={handleAccept}>
            {isPending && pendingAction === "accept" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Accept this job
          </Button>
        ) : null}

        {job.status === "Claimed" ? (
          <Button size="lg" asChild>
            <Link href={`/pilot/job/${token}/complete/${job.id}`}>Mark complete</Link>
          </Button>
        ) : null}

        <Button
          size="lg"
          variant="outline"
          disabled={isPending}
          onClick={() => setShowReport((v) => !v)}
        >
          Report a problem
        </Button>
      </div>

      {showReport ? (
        <div className="flex flex-col gap-2">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's wrong?"
            rows={4}
            autoFocus
          />
          <Button disabled={isPending || !description.trim()} onClick={handleReport}>
            {isPending && pendingAction === "report" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Submit report
          </Button>
        </div>
      ) : null}
    </div>
  );
}
