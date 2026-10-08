import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getAllJobs, getAllRoutes, getCurrentEmployee } from "@/lib/airtable/queries";

export const dynamic = "force-dynamic";

export default async function AppGroupLayout({ children }: LayoutProps<"/">) {
  const [employee, jobs, routes] = await Promise.all([
    getCurrentEmployee(),
    getAllJobs(),
    getAllRoutes(),
  ]);

  if (!employee) {
    redirect("/login");
  }

  return (
    <AppShell employee={employee} jobs={jobs} routes={routes}>
      {children}
    </AppShell>
  );
}
