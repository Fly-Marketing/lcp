import { notFound } from "next/navigation";

import { PilotShell } from "@/components/pilot/pilot-shell";
import { HistoryList } from "@/components/pilot/history-list";
import { HistoryDetailPanel } from "@/components/pilot/history-detail-panel";
import { MasterDetail } from "@/components/pilot/master-detail";
import {
  getStaffForToken,
  getJobById,
  getCompletedJobsForStaff,
  getReportsForJob,
} from "@/lib/pilot/queries";
import { hashTokenForLookup } from "@/lib/pilot/links";

export const dynamic = "force-dynamic";

export default async function PilotHistoryViewPage({
  params,
}: {
  params: Promise<{ token: string; jobId: string }>;
}) {
  const { token, jobId } = await params;
  const staff = await getStaffForToken(hashTokenForLookup(token), token);

  if (!staff) {
    notFound();
  }

  const [job, jobs, reports] = await Promise.all([
    getJobById(jobId, staff.id),
    getCompletedJobsForStaff(staff.id),
    getReportsForJob(jobId),
  ]);

  if (!job) {
    notFound();
  }

  return (
    <PilotShell token={token} staffName={staff.name}>
      <MasterDetail
        list={<HistoryList token={token} jobs={jobs} selectedJobId={job.id} />}
        detail={
          <HistoryDetailPanel token={token} job={job} reports={reports} showBackLink />
        }
      />
    </PilotShell>
  );
}
