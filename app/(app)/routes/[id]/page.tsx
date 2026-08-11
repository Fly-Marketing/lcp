"use client";

import { use } from "react";
import { notFound, useRouter } from "next/navigation";
import { ChevronLeft, Clock, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RouteProgress } from "@/components/routes/route-progress";
import { RouteUnitRow } from "@/components/routes/route-unit-row";
import { useMockStore } from "@/lib/mock-store";

export default function RouteDetailPage({
  params,
}: PageProps<"/routes/[id]">) {
  const { id } = use(params);
  const router = useRouter();
  const { getRoute, jobsForRoute, claimRoute, employee } = useMockStore();

  const route = getRoute(id);
  if (!route) {
    notFound();
  }

  const jobs = jobsForRoute(route.id);
  const completed = jobs.filter((job) => job.status === "completed").length;
  const nextJob = jobs.find((job) => job.status !== "completed");
  const started = route.status === "in_progress" || completed > 0;
  const isOpen = route.status === "open";

  const routeId = route.id;

  async function handlePrimaryAction() {
    if (isOpen) {
      await claimRoute(routeId);
      return;
    }
    if (nextJob) {
      router.push(`/jobs/${nextJob.id}`);
    }
  }

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground"
      >
        <ChevronLeft className="size-4" />
        Back
      </button>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">{route.name}</h1>
        <p className="text-sm text-muted-foreground">{route.area}</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between text-sm">
          <p className="text-foreground">
            {jobs.length} {jobs.length === 1 ? "clean" : "cleans"} · {completed} of{" "}
            {jobs.length} completed
          </p>
          {employee.showPrices && route.totalPay > 0 ? (
            <p className="font-semibold text-foreground">${route.totalPay}</p>
          ) : null}
        </div>
        <div className="mt-3">
          <RouteProgress completed={completed} total={jobs.length} />
        </div>

        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {route.availableAfter}
          </p>
          <p className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {route.deadline}
          </p>
          <p className="flex items-center gap-1.5">
            <MapPin className="size-3.5" />
            {route.area}
          </p>
        </div>
      </div>

      <h2 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Included Units
      </h2>
      <div className="space-y-3">
        {jobs.map((job, index) => (
          <RouteUnitRow
            key={job.id}
            job={job}
            position={index + 1}
            isNext={!isOpen && job.id === nextJob?.id}
          />
        ))}
      </div>

      {route.status !== "completed" ? (
        <Button size="lg" className="mt-6 w-full" onClick={handlePrimaryAction}>
          {isOpen ? "Claim Route" : started ? "Start Next Clean" : "Begin Route"}
        </Button>
      ) : null}
    </div>
  );
}
