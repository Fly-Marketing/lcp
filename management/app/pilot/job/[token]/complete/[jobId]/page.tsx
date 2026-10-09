import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { PilotJobCard } from "@/components/pilot/job-card";
import { CompletionFlow } from "@/components/pilot/completion-flow";
import { getStaffForToken, getJobById } from "@/lib/pilot/queries";
import { hashTokenForLookup } from "@/lib/pilot/links";

export const dynamic = "force-dynamic";

export default async function PilotJobCompletePage({
  params,
}: {
  params: Promise<{ token: string; jobId: string }>;
}) {
  const { token, jobId } = await params;
  const staff = await getStaffForToken(hashTokenForLookup(token), token);

  if (!staff) {
    notFound();
  }

  const job = await getJobById(jobId, staff.id);
  if (!job) {
    notFound();
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <Link
        href={`/pilot/job/${token}`}
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ChevronLeft className="size-4" />
        Back to today
      </Link>

      <PilotJobCard job={job} />
      <CompletionFlow token={token} jobId={job.id} />
    </div>
  );
}
