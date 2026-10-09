"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { acceptJob, reportIssue } from "@/lib/pilot/actions";

export function JobActions({
  token,
  jobId,
  staffId,
  status,
}: {
  token: string;
  jobId: string;
  staffId: string;
  status: string;
}) {
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
      const result = await acceptJob(jobId);
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
      const result = await reportIssue(jobId, staffId, description);
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
    <div className="flex flex-col gap-2">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-2">
        {status === "Open" || status === "Upcoming" || status === "Ready" ? (
          <Button size="sm" disabled={isPending} onClick={handleAccept}>
            {isPending && pendingAction === "accept" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Accept
          </Button>
        ) : null}
        {status === "Claimed" ? (
          <Button size="sm" asChild>
            <Link href={`/pilot/job/${token}/complete/${jobId}`}>Mark complete</Link>
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
