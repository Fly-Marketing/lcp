"use client";

import { PageHeader } from "@/components/layout/page-header";
import { RouteCard } from "@/components/routes/route-card";
import { JobCard } from "@/components/jobs/job-card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { groupByDeadline } from "@/lib/deadline-groups";
import { useMockStore } from "@/lib/mock-store";
import type { CleaningJob, CleaningRoute } from "@/lib/types";

type UpcomingEntry =
  | { kind: "route"; deadlineDate?: string; route: CleaningRoute; jobs: CleaningJob[] }
  | { kind: "job"; deadlineDate?: string; job: CleaningJob };

export default function WorkPage() {
  const { jobs, routes, jobsForRoute } = useMockStore();

  const activeRoutes = routes.filter((route) => route.status !== "completed");
  const completedRoutes = routes.filter((route) => route.status === "completed");

  const standaloneJobs = jobs.filter((job) => !job.routeId);
  const todayJobs = standaloneJobs.filter(
    (job) => job.status !== "completed" && job.status !== "open"
  );
  const upcomingJobs = standaloneJobs.filter((job) => job.status === "open");
  const completedJobs = standaloneJobs.filter(
    (job) => job.status === "completed"
  );

  const upcomingRoutes = activeRoutes.filter((route) => route.status === "open");

  const upcomingEntries: UpcomingEntry[] = [
    ...upcomingRoutes.map(
      (route): UpcomingEntry => ({
        kind: "route",
        deadlineDate: route.deadlineDate,
        route,
        jobs: jobsForRoute(route.id),
      })
    ),
    ...upcomingJobs.map((job): UpcomingEntry => ({ kind: "job", deadlineDate: job.deadlineDate, job })),
  ];

  const upcomingGroups = groupByDeadline(upcomingEntries);

  return (
    <div>
      <PageHeader title="My Work" subtitle="Routes and cleans, sorted by deadline" />

      <Tabs defaultValue="today">
        <TabsList className="w-full">
          <TabsTrigger value="today" className="flex-1">
            Today
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex-1">
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1">
            Completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4 space-y-3">
          {activeRoutes.map((route) => (
            <RouteCard key={route.id} route={route} jobs={jobsForRoute(route.id)} />
          ))}
          {todayJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
          {activeRoutes.length === 0 && todayJobs.length === 0 ? (
            <EmptyState message="Nothing scheduled for today." />
          ) : null}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4 space-y-6">
          {upcomingGroups.map((group) => (
            <div key={group.label}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </h2>
              <div className="space-y-3">
                {group.items.map((entry) =>
                  entry.kind === "route" ? (
                    <RouteCard key={entry.route.id} route={entry.route} jobs={entry.jobs} />
                  ) : (
                    <JobCard key={entry.job.id} job={entry.job} />
                  )
                )}
              </div>
            </div>
          ))}
          {upcomingGroups.length === 0 ? (
            <EmptyState message="No upcoming work right now." />
          ) : null}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-3">
          {completedRoutes.map((route) => (
            <RouteCard key={route.id} route={route} jobs={jobsForRoute(route.id)} />
          ))}
          {completedJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
          {completedRoutes.length === 0 && completedJobs.length === 0 ? (
            <EmptyState message="No completed work yet." />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {message}
    </p>
  );
}
