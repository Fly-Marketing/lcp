"use client";

import Link from "next/link";
import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RouteProgress } from "@/components/routes/route-progress";
import { useMockStore } from "@/lib/mock-store";
import { cn } from "@/lib/utils";
import type { CleaningJob, CleaningRoute } from "@/lib/types";

export function RouteCard({
  route,
  jobs,
  variant = "compact",
}: {
  route: CleaningRoute;
  jobs: CleaningJob[];
  variant?: "prominent" | "compact";
}) {
  const { employee } = useMockStore();
  const completed = jobs.filter((job) => job.status === "completed").length;
  const total = jobs.length;
  const started = route.status === "in_progress" || completed > 0;

  if (variant === "prominent") {
    return (
      <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
        <h3 className="text-lg font-semibold">{route.name}</h3>
        <p className="text-sm text-primary-foreground/80">{route.area}</p>

        <div className="mt-3 flex items-center gap-3 text-sm text-primary-foreground/90">
          <span>
            {total} {total === 1 ? "clean" : "cleans"}
          </span>
          <span className="opacity-60">|</span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {route.availableAfter}
          </span>
        </div>

        <p className="mt-3 text-sm font-medium">
          {completed} of {total} completed
        </p>
        <div className="mt-2 [&_[data-slot=progress-indicator]]:bg-primary-foreground [&_[data-slot=progress]]:bg-primary-foreground/25">
          <RouteProgress completed={completed} total={total} />
        </div>

        <Button
          asChild
          variant="secondary"
          size="lg"
          className="mt-4 w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
        >
          <Link href={`/routes/${route.id}`}>
            {started ? "Continue Route" : "Begin Route"}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <Link
      href={`/routes/${route.id}`}
      className={cn("block rounded-xl border border-border bg-card p-4")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">{route.name}</h3>
          <p className="text-sm text-muted-foreground">
            {route.area} · {total} {total === 1 ? "unit" : "units"}
          </p>
        </div>
        {employee.showPrices && route.totalPay > 0 ? (
          <p className="font-semibold text-foreground">${route.totalPay}</p>
        ) : null}
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        {completed} of {total} complete
      </p>
      <div className="mt-2">
        <RouteProgress completed={completed} total={total} />
      </div>

      <div className="mt-3 flex h-8 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground">
        {started ? "Continue" : "Start"}
      </div>
    </Link>
  );
}
