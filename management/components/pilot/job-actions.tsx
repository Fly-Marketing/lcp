"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { acceptJob, completeJob, reportIssue } from "@/lib/pilot/actions";

export function JobActions({
  jobId,
  staffId,
  status,
}: {
  jobId: string;
  staffId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showReport, setShowReport] = useState(false);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptJob(jobId);
      if (!result.success) {
        setError(result.message ?? "Failed to accept job");
        return;
      }
      router.refresh();
    });
  }

  function handleComplete() {
    setError(null);
    startTransition(async () => {
      const result = await completeJob(jobId);
      if (!result.success) {
        setError(result.message ?? "Failed to complete job");
        return;
      }
      router.refresh();
    });
  }

  function handleReport() {
    if (!description.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await reportIssue(jobId, staffId, description);
      if (!result.success) {
        setError(result.message ?? "Failed to submit report");
        return;
      }
      setDescription("");
      setShowReport(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-2">
        {status === "Open" || status === "Upcoming" || status === "Ready" ? (
          <Button size="sm" disabled={isPending} onClick={handleAccept}>
            Accept
          </Button>
        ) : null}
        {status === "Claimed" ? (
          <Button size="sm" disabled={isPending} onClick={handleComplete}>
            Mark complete
          </Button>
        ) : null}
        <Button
          size="sm"
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
            rows={3}
          />
          <Button size="sm" disabled={isPending || !description.trim()} onClick={handleReport}>
            Submit report
          </Button>
        </div>
      ) : null}
    </div>
  );
}
