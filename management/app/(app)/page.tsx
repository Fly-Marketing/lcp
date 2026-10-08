"use client";

import Link from "next/link";
import { AlertTriangle, ChevronRight, Clock } from "lucide-react";

import { RouteCard } from "@/components/routes/route-card";
import { JobCard } from "@/components/jobs/job-card";
import { groupByDeadline } from "@/lib/deadline-groups";
import { useMockStore } from "@/lib/mock-store";
import type { CleaningJob } from "@/lib/types";

/** Keeps only the soonest job per unit, so a unit with several future checkout events doesn't appear multiple times. */
function dedupeByUnit(jobs: CleaningJob[]): CleaningJob[] {
  const earliestByUnit = new Map<string, CleaningJob>();

  for (const job of jobs) {
    const existing = earliestByUnit.get(job.unitLabel);
    if (!existing || (job.deadlineDate ?? "") < (existing.deadlineDate ?? "")) {
      earliestByUnit.set(job.unitLabel, job);
    }
  }

  return [...earliestByUnit.values()];
}

export default function HomePage() {
  const { employee, jobs, routes, jobsForRoute, reports } = useMockStore();

  const nextRoute = routes.find((route) => route.status !== "completed");
  const nextRouteJobs = nextRoute ? jobsForRoute(nextRoute.id) : [];

  const availableJobs = dedupeByUnit(
    jobs.filter((job) => job.status === "open" && !job.routeId)
  );
  const availableJobGroups = groupByDeadline(availableJobs);

  const needsAttention = reports.filter((report) => report.awaitingFollowUp);
  const routeDeadlineWarning =
    nextRoute && nextRoute.status !== "completed" ? nextRoute : undefined;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Hi, {employee.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s next
        </p>
      </div>

      {nextRoute ? (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Next Work
          </h2>
          <RouteCard route={nextRoute} jobs={nextRouteJobs} variant="prominent" />
        </section>
      ) : null}

      {availableJobGroups.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Available Work
          </h2>
          <div className="space-y-6">
            {availableJobGroups.map((group) => {
              const groupTotal = group.items.reduce((sum, job) => sum + job.pay, 0);
              const groupUnits = group.items.length;

              return (
                <div key={group.label}>
                  <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-white">
                      {group.label}
                    </h3>
                    <div className="flex items-center gap-4">
                      <p className="text-xs font-semibold text-white whitespace-nowrap">
                        Save on gas — do this in one trip
                      </p>
                      <p className="text-xs font-semibold text-white whitespace-nowrap">
                        {employee.showPrices && groupTotal > 0 ? `$${groupTotal} · ` : ""}
                        {groupUnits} {groupUnits === 1 ? "unit" : "units"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {group.items.map((job) => (
                      <JobCard key={job.id} job={job} showClaim />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {needsAttention.length > 0 || routeDeadlineWarning ? (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Needs Attention
          </h2>
          <div className="space-y-3">
            {needsAttention.map((report) => (
              <Link
                key={report.id}
                href="/report"
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">
                    {report.category}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {report.description}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {report.createdAt} · Awaiting office follow-up
                  </p>
                </div>
                <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}

            {routeDeadlineWarning ? (
              <Link
                href={`/routes/${routeDeadlineWarning.id}`}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
              >
                <Clock className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">
                    Route deadline approaching
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {routeDeadlineWarning.name} {routeDeadlineWarning.deadline.toLowerCase()}
                  </p>
                </div>
                <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
