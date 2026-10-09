"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Info } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { JobDetailSheet } from "@/components/pilot/job-detail-sheet";
import { ReportProblemSheet } from "@/components/pilot/report-problem-sheet";
import { acceptJob } from "@/lib/pilot/actions";
import type { PilotJob } from "@/lib/pilot/types";

export function JobActions({ token, job, staffId }: { token: string; job: PilotJob; staffId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDetails, setShowDetails] = useState(false);
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
    <div className="flex flex-col gap-2">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setShowDetails(true)}>
          <Info className="size-4" />
          Details
        </Button>

        {job.status === "Open" || job.status === "Upcoming" || job.status === "Ready" ? (
          <Button size="sm" disabled={isPending} onClick={handleAccept}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Accept
          </Button>
        ) : null}

        {job.status === "Claimed" ? (
          <Button size="sm" asChild>
            <Link href={`/pilot/job/${token}/complete/${job.id}`}>Mark complete</Link>
          </Button>
        ) : null}

        <Button size="sm" variant="outline" onClick={() => setShowReport(true)}>
          Report a problem
        </Button>
      </div>

      <JobDetailSheet job={job} open={showDetails} onOpenChange={setShowDetails} />
      <ReportProblemSheet
        jobId={job.id}
        staffId={staffId}
        unitLabel={job.unitLabel}
        open={showReport}
        onOpenChange={setShowReport}
      />
    </div>
  );
}
