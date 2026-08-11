import Link from "next/link";
import { ArrowRight, Check, Clock, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CleaningJob } from "@/lib/types";

export function RouteUnitRow({
  job,
  isNext,
  position,
}: {
  job: CleaningJob;
  isNext: boolean;
  position: number;
}) {
  const isCompleted = job.status === "completed";

  return (
    <Link
      href={`/jobs/${job.id}`}
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors",
        isNext
          ? "border-primary bg-primary/5"
          : "border-border bg-card"
      )}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium",
          isCompleted
            ? "bg-primary text-primary-foreground"
            : isNext
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
        )}
      >
        {isCompleted ? (
          <Check className="size-4" />
        ) : isNext ? (
          <ArrowRight className="size-4" />
        ) : (
          position
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground">{job.unitLabel}</p>
          {isNext ? (
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Next
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5" />
          {job.propertyName}
        </p>
        {!isCompleted && job.availableAfter ? (
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="size-3.5" />
            {job.availableAfter}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
