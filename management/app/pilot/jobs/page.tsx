import Link from "next/link";
import { redirect } from "next/navigation";

import { PageFrame } from "@/components/pilot/page-frame";
import { HistoryList } from "@/components/pilot/history-list";
import { MasterDetail } from "@/components/pilot/master-detail";
import { requireSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";
import { listManagedJobs } from "@/lib/pilot/service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter } = await searchParams;
  const session = await requireSession("/pilot/jobs");
  if (!session.isAdmin && !hasRole(session, "owner") && !hasRole(session, "manager")) redirect("/pilot/start");

  const isManager = session.isAdmin || hasRole(session, "manager");
  const attention = filter === "attention" && isManager;
  const jobs = attention
    ? await listManagedJobs(session, { scope: "attention" })
    : [
        ...(await listManagedJobs(session, { scope: "upcoming" })),
        ...(await listManagedJobs(session, { scope: "history" })),
      ];

  return (
    <PageFrame session={session}>
      {isManager ? (
        <div className="mb-4 flex gap-2 text-sm">
          <Link
            href="/pilot/jobs"
            className={cn("rounded-full border px-3 py-1", !attention ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}
          >
            All jobs
          </Link>
          <Link
            href="/pilot/jobs?filter=attention"
            className={cn("rounded-full border px-3 py-1", attention ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}
          >
            Needs attention
          </Link>
        </div>
      ) : null}
      <MasterDetail
        list={
          <HistoryList
            hrefBase="/pilot/jobs"
            jobs={jobs}
            variant="staff"
            title="Jobs"
            subtitle="Upcoming cleans and history"
            todoLabel={attention ? "Needs attention" : "Upcoming"}
            emptyTodoHint={attention ? "Nothing needs attention right now." : "Add a cleaning job from Properties."}
          />
        }
      />
    </PageFrame>
  );
}
