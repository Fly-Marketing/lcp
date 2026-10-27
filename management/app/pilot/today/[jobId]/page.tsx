import { notFound, redirect } from "next/navigation";

import { PageFrame } from "@/components/pilot/page-frame";
import { JobDetailPanel } from "@/components/pilot/job-detail-panel";
import { JobList } from "@/components/pilot/job-list";
import { MasterDetail } from "@/components/pilot/master-detail";
import { requireSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";
import { getJobForViewer, listOpenJobsForCleaner } from "@/lib/pilot/service";

export const dynamic = "force-dynamic";

export default async function TodayJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const session = await requireSession(`/pilot/today/${jobId}`);
  if (!hasRole(session, "cleaner")) redirect("/pilot/start");

  const [job, jobs] = await Promise.all([getJobForViewer(session, jobId), listOpenJobsForCleaner(session)]);
  if (!job) notFound();

  return (
    <PageFrame session={session}>
      <MasterDetail
        list={<JobList hrefBase="/pilot/today" jobs={jobs} selectedJobId={job.id} />}
        detail={<JobDetailPanel job={job} showBackLink backHref="/pilot/today" backLabel="Back to today" />}
      />
    </PageFrame>
  );
}
