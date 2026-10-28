import { notFound, redirect } from "next/navigation";

import { HistoryDetailPanel } from "@/components/pilot/history-detail-panel";
import { JobDetailPanel } from "@/components/pilot/job-detail-panel";
import { requireSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";
import { getJobForViewer, listReportsForViewer } from "@/lib/pilot/service";

export const dynamic = "force-dynamic";

// The list and the layout around this detail come from ../layout.tsx.
export default async function MyJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const session = await requireSession(`/pilot/my-jobs/${jobId}`);
  if (!hasRole(session, "cleaner")) redirect("/pilot/start");

  const [job, reports] = await Promise.all([getJobForViewer(session, jobId), listReportsForViewer(session, jobId)]);
  if (!job) notFound();

  return job.completedAt ? (
    <HistoryDetailPanel job={job} reports={reports} showBackLink backHref="/pilot/my-jobs" />
  ) : (
    <JobDetailPanel job={job} showBackLink backHref="/pilot/my-jobs" backLabel="Back to my jobs" />
  );
}
