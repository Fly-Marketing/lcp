import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
        href={`/pilot/job/${token}/view/${job.id}`}
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ChevronLeft className="size-4" />
        Back to job
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{job.unitLabel}</CardTitle>
          <CardDescription>{job.propertyName}</CardDescription>
        </CardHeader>
      </Card>

      <CompletionFlow token={token} jobId={job.id} />
    </div>
  );
}
