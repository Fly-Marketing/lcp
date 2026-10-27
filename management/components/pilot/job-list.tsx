"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";

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

function formatCleaningDay(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
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
  const [isTodayOpen, setIsTodayOpen] = useState(true);
  const [isNextCleaningDayOpen, setIsNextCleaningDayOpen] = useState(false);
  const [isLaterOpen, setIsLaterOpen] = useState(false);
  const today = todayISO();
  const todayJobs = jobs.filter((j) => j.checkoutDate === today);
  const futureJobs = jobs.filter(
    (job): job is PilotJob & { checkoutDate: string } =>
      job.checkoutDate !== null && job.checkoutDate > today
  );
  const nextCleaningDay = futureJobs
    .map((job) => job.checkoutDate)
    .sort()[0];
  const nextCleaningDayJobs = futureJobs.filter((job) => job.checkoutDate === nextCleaningDay);
  const laterJobs = futureJobs.filter((job) => job.checkoutDate !== nextCleaningDay);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Today</h1>
        <p className="text-sm text-muted-foreground">Your turnarounds for today</p>
      </div>

      <button
        type="button"
        aria-expanded={isTodayOpen}
        aria-controls="today-jobs"
        onClick={() => setIsTodayOpen((open) => !open)}
        className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm transition-colors hover:bg-muted/40"
      >
        <CalendarDays className="size-4 text-primary" />
        <span className="font-medium">{formatToday()}</span>
        <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {todayJobs.length} {todayJobs.length === 1 ? "job" : "jobs"} today
        </span>
        <ChevronDown className={`size-4 text-muted-foreground transition-transform ${isTodayOpen ? "rotate-180" : ""}`} />
      </button>

      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open jobs right now.</p>
      ) : (
        <>
          {isTodayOpen ? (
            <div id="today-jobs" className="flex flex-col gap-3">
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
          ) : null}

          {nextCleaningDay && nextCleaningDayJobs.length > 0 ? (
            <button
              type="button"
              aria-expanded={isNextCleaningDayOpen}
              aria-controls="next-cleaning-day-jobs"
              onClick={() => setIsNextCleaningDayOpen((open) => !open)}
              className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/40"
            >
              <CalendarDays className="size-4" />
              <span className="font-medium">Next cleaning day</span>
              <span className="text-xs">· {formatCleaningDay(nextCleaningDay)}</span>
              <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {nextCleaningDayJobs.length} upcoming
              </span>
              <ChevronDown className={`size-4 transition-transform ${isNextCleaningDayOpen ? "rotate-180" : ""}`} />
            </button>
          ) : null}

          {nextCleaningDayJobs.length > 0 && isNextCleaningDayOpen ? (
            <div id="next-cleaning-day-jobs" className="flex flex-col gap-3">
              {nextCleaningDayJobs.map((job) => (
                <PilotJobCard
                  key={job.id}
                  token={token}
                  job={job}
                  isSelected={job.id === selectedJobId}
                />
              ))}
            </div>
          ) : null}

          {laterJobs.length > 0 ? (
            <button
              type="button"
              aria-expanded={isLaterOpen}
              aria-controls="later-jobs"
              onClick={() => setIsLaterOpen((open) => !open)}
              className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/40"
            >
              <CalendarDays className="size-4" />
              <span className="font-medium">Later this week</span>
              <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {laterJobs.length} upcoming
              </span>
              <ChevronDown className={`size-4 transition-transform ${isLaterOpen ? "rotate-180" : ""}`} />
            </button>
          ) : null}

          {laterJobs.length > 0 && isLaterOpen ? (
            <div id="later-jobs" className="flex flex-col gap-3">
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
