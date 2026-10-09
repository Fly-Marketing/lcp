import { notFound } from "next/navigation";

import { PilotShell } from "@/components/pilot/pilot-shell";
import { JobList } from "@/components/pilot/job-list";
import { JobDetailPanel } from "@/components/pilot/job-detail-panel";
import { MasterDetail } from "@/components/pilot/master-detail";
import { getStaffForToken, getJobById, getJobsForStaff } from "@/lib/pilot/queries";
import { hashTokenForLookup } from "@/lib/pilot/links";

export const dynamic = "force-dynamic";

export default async function PilotJobViewPage({
  params,
}: {
  params: Promise<{ token: string; jobId: string }>;
}) {
  const { token, jobId } = await params;
  const staff = await getStaffForToken(hashTokenForLookup(token), token);

  if (!staff) {
    notFound();
  }

  const [job, jobs] = await Promise.all([
    getJobById(jobId, staff.id),
    getJobsForStaff(staff.id),
  ]);

  if (!job) {
    notFound();
  }

  return (
    <PilotShell token={token} staffName={staff.name}>
      <MasterDetail
        list={<JobList token={token} jobs={jobs} selectedJobId={job.id} />}
        detail={<JobDetailPanel token={token} job={job} staffId={staff.id} showBackLink />}
      />
    </PilotShell>
  );
}
