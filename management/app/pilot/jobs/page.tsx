import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

// The job list and the All / Needs attention tabs come from the layout.
export default async function JobsPage() {
  const session = await requireSession("/pilot/jobs");
  if (!session.isAdmin && !hasRole(session, "owner") && !hasRole(session, "manager")) redirect("/pilot/start");
  return null;
}
