"use client";

import { useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  CalendarX2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { HistoryRow } from "@/components/pilot/history-row";
import { Button } from "@/components/ui/button";
import type { PilotJob } from "@/lib/pilot/types";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function completedMonthKey(completedAt: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Edmonton",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(completedAt));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

function formatMonth(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function moveMonth(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

export function HistoryList({
  hrefBase,
  jobs,
  selectedJobId,
  variant = "cleaner",
  title = "My jobs",
  subtitle = "Your to-do and completed cleans",
  todoLabel = "To do",
  emptyTodoHint = "Accept one from Today to move it here.",
}: {
  hrefBase: string;
  jobs: PilotJob[];
  selectedJobId?: string;
  variant?: "cleaner" | "staff";
  title?: string;
  subtitle?: string;
  todoLabel?: string;
  emptyTodoHint?: string;
}) {
  const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [finishedMonth, setFinishedMonth] = useState(currentMonth);
  const [isCurrentOpen, setIsCurrentOpen] = useState(true);
  const [isFinishedOpen, setIsFinishedOpen] = useState(false);

  const currentJobs = jobs.filter((job) => !job.completedAt && !job.cancelledAt);
  const finishedJobs = jobs.filter(
    (job) =>
      job.completedAt &&
      !job.cancelledAt &&
      completedMonthKey(job.completedAt) === monthKey(finishedMonth)
  );
  const isViewingCurrentMonth = monthKey(finishedMonth) === monthKey(currentMonth);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <button
        type="button"
        aria-expanded={isCurrentOpen}
        aria-controls="current-jobs"
        onClick={() => {
          const nextOpen = !isCurrentOpen;
          setIsCurrentOpen(nextOpen);
          if (nextOpen) setIsFinishedOpen(false);
        }}
        className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm transition-colors hover:bg-muted/40"
      >
        <CalendarDays className="size-4 text-primary" />
        <span className="font-medium">{todoLabel}</span>
        <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {currentJobs.length} {currentJobs.length === 1 ? "job" : "jobs"}
        </span>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform ${isCurrentOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isCurrentOpen ? (
        <div id="current-jobs" className="flex flex-col gap-3">
          {currentJobs.length > 0 ? (
            currentJobs.map((job) => (
              <HistoryRow
                key={job.id}
                hrefBase={hrefBase}
                variant={variant}
                job={job}
                isSelected={job.id === selectedJobId}
              />
            ))
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <BriefcaseBusiness className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Nothing to do yet</p>
                <p className="text-xs text-muted-foreground">{emptyTodoHint}</p>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <button
        type="button"
        aria-expanded={isFinishedOpen}
        aria-controls="finished-jobs"
        onClick={() => {
          const nextOpen = !isFinishedOpen;
          setIsFinishedOpen(nextOpen);
          if (nextOpen) setIsCurrentOpen(false);
        }}
        className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm transition-colors hover:bg-muted/40"
      >
        <CalendarDays className="size-4 text-primary" />
        <span className="font-medium">Completed</span>
        <ChevronDown
          className={`ml-auto size-4 text-muted-foreground transition-transform ${isFinishedOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isFinishedOpen ? (
        <div id="finished-jobs" className="flex flex-col gap-3">
          <div className="flex justify-end">
            <div className="flex items-center rounded-lg border border-border bg-card p-1 text-xs shadow-sm">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Previous month"
                onClick={() => setFinishedMonth((month) => moveMonth(month, -1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-28 px-2 text-center font-medium">
                {formatMonth(finishedMonth)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Next month"
                disabled={isViewingCurrentMonth}
                onClick={() => setFinishedMonth((month) => moveMonth(month, 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="xs"
                className="ml-1"
                disabled={isViewingCurrentMonth}
                onClick={() => setFinishedMonth(currentMonth)}
              >
                Now
              </Button>
            </div>
          </div>

          {finishedJobs.length > 0 ? (
            finishedJobs.map((job) => (
              <HistoryRow
                key={job.id}
                hrefBase={hrefBase}
                variant={variant}
                job={job}
                isSelected={job.id === selectedJobId}
              />
            ))
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <CalendarX2 className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">No completed jobs this month</p>
                <p className="text-xs text-muted-foreground">
                  Choose another month to view earlier jobs.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
