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

// Cleaners: their own accepted jobs and completed history.
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

export type StaffFilter = "all" | "mine" | "attention";

const FILTERS: { value: StaffFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "mine", label: "My jobs" },
  { value: "attention", label: "Needs attention" },
];

// Owners, managers and admins: All · My jobs · Needs attention, chosen with ?filter=.
export function StaffJobsShell({
  allJobs,
  myJobs,
  attentionJobs,
  canFilterAttention,
  children,
}: {
  allJobs: PilotJob[];
  myJobs: PilotJob[];
  attentionJobs: PilotJob[];
  canFilterAttention: boolean;
  children: React.ReactNode;
}) {
  const requested = useSearchParams().get("filter");
  const selectedJobId = useSelectedLayoutSegment() ?? undefined;
  const filter: StaffFilter =
    requested === "mine" || (requested === "attention" && canFilterAttention) ? requested : "all";
  const visibleFilters = FILTERS.filter((f) => f.value !== "attention" || canFilterAttention);
  const jobs = filter === "mine" ? myJobs : filter === "attention" ? attentionJobs : allJobs;
  const todoLabel = filter === "attention" ? "Needs attention" : "Upcoming";
  const emptyTodoHint =
    filter === "attention"
      ? "Nothing needs attention right now."
      : filter === "mine"
        ? "Jobs you accept or are assigned to show up here."
        : "Add a cleaning job from Properties.";

  return (
    <>
      <div className="mb-4 flex gap-2 text-sm">
        {visibleFilters.map((f) => (
          <Link
            key={f.value}
            href={f.value === "all" ? "/pilot/jobs" : `/pilot/jobs?filter=${f.value}`}
            className={cn(
              "rounded-full border px-3 py-1",
              filter === f.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>
      <MasterDetail
        list={
          <HistoryList
            hrefBase="/pilot/jobs"
            jobs={jobs}
            selectedJobId={selectedJobId}
            variant="staff"
            title="Jobs"
            subtitle="Upcoming cleans and history"
            todoLabel={todoLabel}
            emptyTodoHint={emptyTodoHint}
          />
        }
        detail={selectedJobId ? children : undefined}
      />
    </>
  );
}
