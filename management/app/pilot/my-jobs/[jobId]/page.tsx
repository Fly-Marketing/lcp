import { notFound, redirect } from "next/navigation";

import { PageFrame } from "@/components/pilot/page-frame";
import { HistoryList } from "@/components/pilot/history-list";
import { HistoryDetailPanel } from "@/components/pilot/history-detail-panel";
import { JobDetailPanel } from "@/components/pilot/job-detail-panel";
import { MasterDetail } from "@/components/pilot/master-detail";
import { requireSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";
import { getJobForViewer, listMyJobs, listReportsForViewer } from "@/lib/pilot/service";

export const dynamic = "force-dynamic";

export default async function MyJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const session = await requireSession(`/pilot/my-jobs/${jobId}`);
  if (!hasRole(session, "cleaner")) redirect("/pilot/start");

  const [job, jobs, reports] = await Promise.all([
    getJobForViewer(session, jobId),
    listMyJobs(session),
    listReportsForViewer(session, jobId),
  ]);
  if (!job) notFound();

  return (
    <PageFrame session={session}>
      <MasterDetail
        list={<HistoryList hrefBase="/pilot/my-jobs" jobs={jobs} selectedJobId={job.id} />}
        detail={
          job.completedAt ? (
            <HistoryDetailPanel job={job} reports={reports} showBackLink backHref="/pilot/my-jobs" />
          ) : (
            <JobDetailPanel
              job={job}
              showBackLink
              backHref="/pilot/my-jobs"
              backLabel="Back to my jobs"
            />
          )
        }
      />
    </PageFrame>
  );
}
