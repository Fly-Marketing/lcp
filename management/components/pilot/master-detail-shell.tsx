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

export type ScheduleFilter = "all" | "mine" | "attention" | "unaccepted";
export type ScheduleDay = "all" | "today" | "tomorrow";

const FILTERS: { value: ScheduleFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "mine", label: "My jobs" },
  { value: "attention", label: "Needs attention" },
  { value: "unaccepted", label: "Unaccepted" },
];

// Links from messages can open a day (?day=today|tomorrow) and a filter (?filter=unaccepted, etc.).
export function ScheduleShell({
  allJobs,
  myJobs,
  attentionJobs,
  canFilterMine,
  canFilterAttention,
  today,
  tomorrow,
  children,
}: {
  allJobs: PilotJob[];
  myJobs: PilotJob[];
  attentionJobs: PilotJob[];
  canFilterMine: boolean;
  canFilterAttention: boolean;
  today: string;
  tomorrow: string;
  children: React.ReactNode;
}) {
  const params = useSearchParams();
  const requested = params.get("filter");
  const requestedDay = params.get("day");
  const selectedJobId = useSelectedLayoutSegment() ?? undefined;

  const filter: ScheduleFilter =
    (requested === "mine" && canFilterMine) ||
    (requested === "attention" && canFilterAttention) ||
    (requested === "unaccepted" && canFilterAttention)
      ? requested
      : "all";
  const day: ScheduleDay = requestedDay === "today" || requestedDay === "tomorrow" ? requestedDay : "all";
  const visibleFilters = FILTERS.filter(
    (f) =>
      (f.value !== "mine" || canFilterMine) &&
      ((f.value !== "attention" && f.value !== "unaccepted") || canFilterAttention)
  );

  const onDay = (jobs: PilotJob[]) => {
    if (day === "today") return jobs.filter((j) => j.checkoutDate !== null && j.checkoutDate <= today);
    if (day === "tomorrow") return jobs.filter((j) => j.checkoutDate === tomorrow);
    return jobs;
  };

  const base =
    filter === "mine" ? myJobs : filter === "attention" ? attentionJobs : filter === "unaccepted" ? allJobs.filter((j) => !j.assignedStaffId) : allJobs;
  const shown = onDay(base);

  const list =
    filter === "all" || filter === "unaccepted" ? (
      <JobList hrefBase="/pilot/jobs" jobs={shown} selectedJobId={selectedJobId} showHeader={false} today={today} />
    ) : (
      <HistoryList
        hrefBase="/pilot/jobs"
        jobs={shown}
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
              href={f.value === "all" ? "/pilot/jobs" : `/pilot/jobs?filter=${f.value}${day !== "all" ? `&day=${day}` : ""}`}
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
