import { notFound, redirect } from "next/navigation";

import { HistoryDetailPanel } from "@/components/pilot/history-detail-panel";
import { JobDetailPanel } from "@/components/pilot/job-detail-panel";
import { StaffJobPanel } from "@/components/pilot/staff-job-panel";
import { requireSession } from "@/lib/auth/session";
import { grantsAt, hasRole } from "@/lib/auth/permissions";
import { getJobForViewer, getPriceHistory, jobPermissions, listReportsForViewer } from "@/lib/pilot/service";

export const dynamic = "force-dynamic";

// The list, filters and layout around this detail come from ../layout.tsx.
export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const session = await requireSession(`/pilot/jobs/${jobId}`);
  const staff = session.isAdmin || hasRole(session, "owner") || hasRole(session, "manager");
  const cleaner = hasRole(session, "cleaner");
  if (!staff && !cleaner) redirect("/pilot/start");

  const job = await getJobForViewer(session, jobId);
  if (!job) notFound();

  const staffHere = !!job.buildingId && (session.isAdmin || grantsAt(session, job.buildingId, ["owner", "manager"]).length > 0);
  if (!staffHere) {
    // Cleaner view: open work and their own jobs. getJobForViewer already limits what they can see.
    if (!cleaner) notFound();
    const reports = await listReportsForViewer(session, jobId);
    return job.completedAt ? (
      <HistoryDetailPanel job={job} reports={reports} showBackLink backHref="/pilot/jobs" />
    ) : (
      <JobDetailPanel job={job} showBackLink backHref="/pilot/jobs" backLabel="Back to jobs" />
    );
  }

  const [reports, priceHistory] = await Promise.all([
    listReportsForViewer(session, jobId),
    getPriceHistory(session, jobId),
  ]);
  const perms = jobPermissions(session, job);
  const isManagerHere = session.isAdmin || grantsAt(session, job.buildingId ?? "", ["manager"]).length > 0;

  return (
    <StaffJobPanel
      job={job}
      status={perms.ownerStatus}
      reports={reports}
      priceHistory={priceHistory}
      canEditPrice={perms.canEditPrice}
      canSetResult={perms.canSetResult && isManagerHere}
      canResolve={isManagerHere}
      backHref="/pilot/jobs"
    />
  );
}
