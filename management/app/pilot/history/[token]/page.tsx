import { notFound } from "next/navigation";

import { PilotShell } from "@/components/pilot/pilot-shell";
import { HistoryList } from "@/components/pilot/history-list";
import { MasterDetail } from "@/components/pilot/master-detail";
import { getStaffForToken, getCompletedJobsForStaff } from "@/lib/pilot/queries";
import { hashTokenForLookup } from "@/lib/pilot/links";

export const dynamic = "force-dynamic";

export default async function PilotHistoryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const staff = await getStaffForToken(hashTokenForLookup(token), token);

  if (!staff) {
    notFound();
  }

  const jobs = await getCompletedJobsForStaff(staff.id);

  return (
    <PilotShell token={token} staffName={staff.name}>
      <MasterDetail list={<HistoryList token={token} jobs={jobs} />} />
    </PilotShell>
  );
}
