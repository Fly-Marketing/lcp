import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

// The job list comes from the layout. This page only enforces sign-in and role.
export default async function MyJobsPage() {
  const session = await requireSession("/pilot/my-jobs");
  if (!hasRole(session, "cleaner")) redirect("/pilot/start");
  return null;
}
