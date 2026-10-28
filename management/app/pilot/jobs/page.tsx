import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

// The job list and filters come from the layout. This page only enforces sign-in and role.
export default async function JobsPage() {
  const session = await requireSession("/pilot/jobs");
  const staff = session.isAdmin || hasRole(session, "owner") || hasRole(session, "manager");
  if (!staff && !hasRole(session, "cleaner")) redirect("/pilot/start");
  return null;
}
