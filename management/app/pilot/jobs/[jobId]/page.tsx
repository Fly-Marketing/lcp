import { notFound, redirect } from "next/navigation";

import { PageFrame } from "@/components/pilot/page-frame";
import { HistoryList } from "@/components/pilot/history-list";
import { MasterDetail } from "@/components/pilot/master-detail";
import { StaffJobPanel } from "@/components/pilot/staff-job-panel";
import { requireSession } from "@/lib/auth/session";
import { grantsAt, hasRole } from "@/lib/auth/permissions";
import {
  getJobForViewer,
  getPriceHistory,
  jobPermissions,
  listManagedJobs,
  listReportsForViewer,
} from "@/lib/pilot/service";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const session = await requireSession(`/pilot/jobs/${jobId}`);
  if (!session.isAdmin && !hasRole(session, "owner") && !hasRole(session, "manager")) redirect("/pilot/start");

  const job = await getJobForViewer(session, jobId);
  if (!job || !job.buildingId) notFound();
  // Cleaner-only access to this building belongs on the cleaner views.
  const staffHere = session.isAdmin || grantsAt(session, job.buildingId, ["owner", "manager"]).length > 0;
  if (!staffHere) notFound();

  const [reports, upcoming, history, priceHistory] = await Promise.all([
    listReportsForViewer(session, jobId),
    listManagedJobs(session, { scope: "upcoming" }),
    listManagedJobs(session, { scope: "history" }),
    getPriceHistory(session, jobId),
  ]);
  const perms = jobPermissions(session, job);
  const isManagerHere = session.isAdmin || grantsAt(session, job.buildingId, ["manager"]).length > 0;

  return (
    <PageFrame session={session}>
      <MasterDetail
        list={
          <HistoryList
            hrefBase="/pilot/jobs"
            jobs={[...upcoming, ...history]}
            selectedJobId={job.id}
            variant="staff"
            title="Jobs"
            subtitle="Upcoming cleans and history"
            todoLabel="Upcoming"
            emptyTodoHint="Add a cleaning job from Properties."
          />
        }
        detail={
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
        }
      />
    </PageFrame>
  );
}
