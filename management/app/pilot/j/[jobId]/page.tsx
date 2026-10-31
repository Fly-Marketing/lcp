import { notFound, redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";
import { getJobForViewer } from "@/lib/pilot/service";

export const dynamic = "force-dynamic";

// Non-secret, reopenable job link used in SMS. It reveals nothing until the person is
// signed in on a trusted device, then routes them to the right view for their role.
export default async function JobLinkPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const session = await requireSession(`/pilot/j/${jobId}`);
  const job = await getJobForViewer(session, jobId);
  if (!job) notFound();

  const staff = job.buildingId
    ? session.isAdmin || session.grants.some((g) => g.buildingId === job.buildingId && g.role !== "cleaner")
    : false;
  if (staff) redirect(`/pilot/jobs/${jobId}`);
  if (hasRole(session, "cleaner")) {
    redirect(`/pilot/jobs/${jobId}`);
  }
  notFound();
}
