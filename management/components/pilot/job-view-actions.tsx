"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ReportProblemDialog } from "@/components/pilot/report-problem-dialog";
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

  return (
    <div className="flex flex-col gap-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-col gap-2">
        {job.status === "Open" || job.status === "Upcoming" || job.status === "Ready" ? (
          <Button size="lg" disabled={isPending} onClick={handleAccept}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Accept this job
          </Button>
        ) : null}

        {job.status === "Claimed" ? (
          <Button size="lg" asChild>
            <Link href={`/pilot/job/${token}/complete/${job.id}`}>Mark complete</Link>
          </Button>
        ) : null}

        <Button size="lg" variant="outline" onClick={() => setShowReport(true)}>
          Report a problem
        </Button>
      </div>

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
