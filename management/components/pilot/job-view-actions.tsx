"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ReportProblemDialog } from "@/components/pilot/report-problem-dialog";
import { CompletionFlow } from "@/components/pilot/completion-flow";
import { acceptJob } from "@/lib/pilot/actions";
import type { PilotJob } from "@/lib/pilot/types";

export function JobViewActions({ token, job, staffId }: { token: string; job: PilotJob; staffId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showReport, setShowReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptJob(token, job.id);
      if (!result.success) {
        const message = result.message ?? "Failed to accept job";
        setError(message);
        toast.error(message);
        return;
      }
      toast.success("Job accepted");
      router.push(`/pilot/history/${token}/view/${job.id}`);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {job.status === "Open" || job.status === "Upcoming" || job.status === "Ready" ? (
        <Button size="lg" disabled={isPending} onClick={handleAccept}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Accept this job
        </Button>
      ) : null}

      {job.status === "Claimed" ? (
        <CompletionFlow token={token} jobId={job.id} checklistItems={job.checklistItems} />
      ) : null}

      {!job.cancelledAt ? (
        <Button size="lg" variant="outline" onClick={() => setShowReport(true)}>
          Report a problem
        </Button>
      ) : null}

      <ReportProblemDialog
        jobId={job.id}
        staffId={staffId}
        unitLabel={job.unitLabel}
        open={showReport}
        onOpenChange={setShowReport}
        onSubmitted={() => router.refresh()}
      />
    </div>
  );
}
