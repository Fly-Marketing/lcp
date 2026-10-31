"use client";

import Link from "next/link";
import { useSearchParams, useSelectedLayoutSegment } from "next/navigation";

import { HistoryList } from "@/components/pilot/history-list";
import { JobList } from "@/components/pilot/job-list";
import { MasterDetail } from "@/components/pilot/master-detail";
import { cn } from "@/lib/utils";
import type { PilotJob } from "@/lib/pilot/types";

// Schedule is the one place for jobs. The list stays mounted while a job is selected, and the
// selected job id is read here, on the client, because layouts can't see it.

export type ScheduleFilter = "all" | "mine" | "attention";

const FILTERS: { value: ScheduleFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "mine", label: "My jobs" },
  { value: "attention", label: "Needs attention" },
];

export function ScheduleShell({
  allJobs,
  myJobs,
  attentionJobs,
  canFilterMine,
  canFilterAttention,
  children,
}: {
  allJobs: PilotJob[];
  myJobs: PilotJob[];
  attentionJobs: PilotJob[];
  canFilterMine: boolean;
  canFilterAttention: boolean;
  children: React.ReactNode;
}) {
  const requested = useSearchParams().get("filter");
  const selectedJobId = useSelectedLayoutSegment() ?? undefined;
  const filter: ScheduleFilter =
    (requested === "mine" && canFilterMine) || (requested === "attention" && canFilterAttention) ? requested : "all";
  const visibleFilters = FILTERS.filter(
    (f) => (f.value !== "mine" || canFilterMine) && (f.value !== "attention" || canFilterAttention)
  );

  const list =
    filter === "all" ? (
      <JobList hrefBase="/pilot/jobs" jobs={allJobs} selectedJobId={selectedJobId} showHeader={false} />
    ) : (
      <HistoryList
        hrefBase="/pilot/jobs"
        jobs={filter === "mine" ? myJobs : attentionJobs}
        selectedJobId={selectedJobId}
        variant="staff"
        showHeader={false}
        todoLabel={filter === "attention" ? "Needs attention" : "Upcoming"}
        emptyTodoHint={
          filter === "attention" ? "Nothing needs attention right now." : "Jobs you accept or are assigned to show up here."
        }
      />
    );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Schedule</h1>
        <p className="text-sm text-muted-foreground">Upcoming cleans and history</p>
      </div>

      {visibleFilters.length > 1 ? (
        <div className="flex flex-wrap gap-2 text-sm">
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
      ) : null}

      <MasterDetail list={list} detail={selectedJobId ? children : undefined} />
    </div>
  );
}
