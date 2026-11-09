"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";

import { CollapsibleCard } from "@/components/pilot/collapsible-card";
import { PilotJobCard } from "@/components/pilot/job-card";
import type { PilotJob } from "@/lib/pilot/types";

function formatToday() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Edmonton",
  });
}

function formatCleaningDay(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// "Today" for today's cleans, "-1 day" / "-2 days" for past due ones.
function dayTag(date: string | null, today: string): { label: string; pastDue: boolean } | null {
  if (!date) return null;
  if (date === today) return { label: "Today", pastDue: false };
  const days = Math.round((Date.parse(today) - Date.parse(date)) / 86400000);
  return { label: `-${days} ${days === 1 ? "day" : "days"}`, pastDue: true };
}

const badge = (text: string) => (
  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{text}</span>
);

type Section = "today" | "next" | "later";

export function JobList({
  hrefBase,
  jobs,
  selectedJobId,
  showHeader = true,
  today,
}: {
  hrefBase: string;
  jobs: PilotJob[];
  selectedJobId?: string;
  showHeader?: boolean;
  // Today's date in Edmonton (YYYY-MM-DD), computed on the server.
  today: string;
}) {
  // One group is open at a time: opening one closes the others.
  const [openSection, setOpenSection] = useState<Section | null>("today");
  const toggle = (section: Section) => setOpenSection((current) => (current === section ? null : section));

  // Today carries over anything still open from earlier dates, so past-due work stays visible.
  const todayJobs = jobs.filter((j) => j.checkoutDate !== null && j.checkoutDate <= today);
  const overdueCount = jobs.filter((j) => j.checkoutDate !== null && j.checkoutDate < today).length;
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
      {showHeader ? (
        <div>
          <h1 className="font-heading text-2xl font-semibold">Today</h1>
          <p className="text-sm text-muted-foreground">Your turnarounds for today</p>
        </div>
      ) : null}

      <CollapsibleCard
        id="today-jobs"
        open={openSection === "today"}
        onToggle={() => toggle("today")}
        icon={<CalendarDays className="size-4 text-primary" />}
        title={
          <>
            <span className="font-medium">{formatToday()}</span>
            {overdueCount > 0 ? <span className="text-xs font-semibold text-rose-600">· {overdueCount} past due</span> : null}
          </>
        }
        badge={badge(`${todayJobs.length} ${todayJobs.length === 1 ? "job" : "jobs"} today`)}
      >
        <div className="flex flex-col gap-3">
          {todayJobs.map((job) => (
            <PilotJobCard key={job.id} hrefBase={hrefBase} job={job} tag={dayTag(job.checkoutDate, today)} isSelected={job.id === selectedJobId} />
          ))}
        </div>
      </CollapsibleCard>

      {jobs.length === 0 ? <p className="text-sm text-muted-foreground">No open jobs right now.</p> : null}

      {nextCleaningDay && nextCleaningDayJobs.length > 0 ? (
        <CollapsibleCard
          id="next-cleaning-day-jobs"
          open={openSection === "next"}
          onToggle={() => toggle("next")}
          icon={<CalendarDays className="size-4" />}
          title={
            <>
              <span className="font-medium">Next cleaning day</span>
              <span className="text-xs">· {formatCleaningDay(nextCleaningDay)}</span>
            </>
          }
          badge={badge(`${nextCleaningDayJobs.length} upcoming`)}
        >
          <div className="flex flex-col gap-3">
            {nextCleaningDayJobs.map((job) => (
              <PilotJobCard key={job.id} hrefBase={hrefBase} job={job} isSelected={job.id === selectedJobId} />
            ))}
          </div>
        </CollapsibleCard>
      ) : null}

      {laterJobs.length > 0 ? (
        <CollapsibleCard
          id="later-jobs"
          open={openSection === "later"}
          onToggle={() => toggle("later")}
          icon={<CalendarDays className="size-4" />}
          title={<span className="font-medium">Later this week</span>}
          badge={badge(`${laterJobs.length} upcoming`)}
        >
          <div className="flex flex-col gap-3">
            {laterJobs.map((job) => (
              <PilotJobCard key={job.id} hrefBase={hrefBase} job={job} isSelected={job.id === selectedJobId} />
            ))}
          </div>
        </CollapsibleCard>
      ) : null}
    </div>
  );
}
