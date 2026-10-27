import { redirect } from "next/navigation";

import { PageFrame } from "@/components/pilot/page-frame";
import { HistoryList } from "@/components/pilot/history-list";
import { MasterDetail } from "@/components/pilot/master-detail";
import { requireSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";
import { listMyJobs } from "@/lib/pilot/service";

export const dynamic = "force-dynamic";

export default async function MyJobsPage() {
  const session = await requireSession("/pilot/my-jobs");
  if (!hasRole(session, "cleaner")) redirect("/pilot/start");
  const jobs = await listMyJobs(session);

  return (
    <PageFrame session={session}>
      <MasterDetail list={<HistoryList hrefBase="/pilot/my-jobs" jobs={jobs} />} />
    </PageFrame>
  );
}
