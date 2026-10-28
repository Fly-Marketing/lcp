"use client";

import Link from "next/link";
import { useSearchParams, useSelectedLayoutSegment } from "next/navigation";

import { HistoryList } from "@/components/pilot/history-list";
import { JobList } from "@/components/pilot/job-list";
import { MasterDetail } from "@/components/pilot/master-detail";
import { cn } from "@/lib/utils";
import type { PilotJob } from "@/lib/pilot/types";

// These shells live in the section layouts, so the list stays mounted while a job is
// selected. The selected job id is read here, on the client, because layouts can't see it.

type HistoryListProps = Omit<React.ComponentProps<typeof HistoryList>, "jobs" | "selectedJobId">;

export function OpenJobsShell({
  hrefBase,
  jobs,
  children,
}: {
  hrefBase: string;
  jobs: PilotJob[];
  children: React.ReactNode;
}) {
  const selectedJobId = useSelectedLayoutSegment() ?? undefined;
  return (
    <MasterDetail
      list={<JobList hrefBase={hrefBase} jobs={jobs} selectedJobId={selectedJobId} />}
      detail={selectedJobId ? children : undefined}
    />
  );
}

export function HistoryShell({
  jobs,
  listProps,
  children,
}: {
  jobs: PilotJob[];
  listProps: HistoryListProps;
  children: React.ReactNode;
}) {
  const selectedJobId = useSelectedLayoutSegment() ?? undefined;
  return (
    <MasterDetail
      list={<HistoryList {...listProps} jobs={jobs} selectedJobId={selectedJobId} />}
      detail={selectedJobId ? children : undefined}
    />
  );
}

// Managers and admins: "All jobs" or "Needs attention", chosen with ?filter=attention.
export function StaffJobsShell({
  allJobs,
  attentionJobs,
  canFilter,
  children,
}: {
  allJobs: PilotJob[];
  attentionJobs: PilotJob[];
  canFilter: boolean;
  children: React.ReactNode;
}) {
  const filter = useSearchParams().get("filter");
  const selectedJobId = useSelectedLayoutSegment() ?? undefined;
  const attention = canFilter && filter === "attention";
  const jobs = attention ? attentionJobs : allJobs;

  return (
    <>
      {canFilter ? (
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
            selectedJobId={selectedJobId}
            variant="staff"
            title="Jobs"
            subtitle="Upcoming cleans and history"
            todoLabel={attention ? "Needs attention" : "Upcoming"}
            emptyTodoHint={attention ? "Nothing needs attention right now." : "Add a cleaning job from Properties."}
          />
        }
        detail={selectedJobId ? children : undefined}
      />
    </>
  );
}
