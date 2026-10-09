import { CalendarDays } from "lucide-react";

import { PilotJobCard } from "@/components/pilot/job-card";
import type { PilotJob } from "@/lib/pilot/types";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatToday() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function JobList({
  token,
  jobs,
  selectedJobId,
}: {
  token: string;
  jobs: PilotJob[];
  selectedJobId?: string;
}) {
  const today = todayISO();
  const todayJobs = jobs.filter((j) => j.checkoutDate === today);
  const laterJobs = jobs.filter((j) => j.checkoutDate !== today);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Today</h1>
        <p className="text-sm text-muted-foreground">Your turnarounds for today</p>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
        <CalendarDays className="size-4 text-primary" />
        <span className="font-medium">{formatToday()}</span>
        <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {todayJobs.length} {todayJobs.length === 1 ? "job" : "jobs"} today
        </span>
      </div>

      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open jobs right now.</p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {todayJobs.map((job) => (
              <PilotJobCard
                key={job.id}
                token={token}
                job={job}
                isToday
                isSelected={job.id === selectedJobId}
              />
            ))}
          </div>

          {laterJobs.length > 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              <CalendarDays className="size-4" />
              <span>
                Later this week · {laterJobs.length} upcoming {laterJobs.length === 1 ? "job" : "jobs"}
              </span>
            </div>
          ) : null}

          {laterJobs.length > 0 ? (
            <div className="flex flex-col gap-3">
              {laterJobs.map((job) => (
                <PilotJobCard
                  key={job.id}
                  token={token}
                  job={job}
                  isSelected={job.id === selectedJobId}
                />
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
