import { notFound } from "next/navigation";

import { PilotShell } from "@/components/pilot/pilot-shell";
import { JobList } from "@/components/pilot/job-list";
import { MasterDetail } from "@/components/pilot/master-detail";
import { getStaffForToken, getJobsForStaff } from "@/lib/pilot/queries";
import { hashTokenForLookup } from "@/lib/pilot/links";
import { usesFakeData } from "@/lib/pilot/mode";

export const dynamic = "force-dynamic";

export default async function PilotJobPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const staff = await getStaffForToken(hashTokenForLookup(token), token);

  if (!staff) {
    notFound();
  }

  const jobs = await getJobsForStaff(staff.id);

  return (
    <PilotShell token={token} staffName={staff.name}>
      {usesFakeData() ? (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          FAKE DATA MODE — nothing here touches the real database
        </div>
      ) : null}

      <MasterDetail list={<JobList token={token} jobs={jobs} />} />
    </PilotShell>
  );
}
