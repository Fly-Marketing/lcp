import { notFound, redirect } from "next/navigation";

import { JobDetailPanel } from "@/components/pilot/job-detail-panel";
import { requireSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";
import { getJobForViewer } from "@/lib/pilot/service";

export const dynamic = "force-dynamic";

// The list and the layout around this detail come from ../layout.tsx.
export default async function TodayJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const session = await requireSession(`/pilot/today/${jobId}`);
  if (!hasRole(session, "cleaner")) redirect("/pilot/start");

  const job = await getJobForViewer(session, jobId);
  if (!job) notFound();

  return <JobDetailPanel job={job} showBackLink backHref="/pilot/today" backLabel="Back to today" />;
}
