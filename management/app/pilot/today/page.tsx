import { redirect } from "next/navigation";

import { PageFrame } from "@/components/pilot/page-frame";
import { JobList } from "@/components/pilot/job-list";
import { MasterDetail } from "@/components/pilot/master-detail";
import { requireSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";
import { listOpenJobsForCleaner } from "@/lib/pilot/service";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const session = await requireSession("/pilot/today");
  if (!hasRole(session, "cleaner")) redirect("/pilot/start");
  const jobs = await listOpenJobsForCleaner(session);

  return (
    <PageFrame session={session}>
      <MasterDetail list={<JobList hrefBase="/pilot/today" jobs={jobs} />} />
    </PageFrame>
  );
}
