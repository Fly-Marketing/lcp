import Link from "next/link";
import { Calendar, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PilotJob } from "@/lib/pilot/types";

export function PilotJobCard({
  hrefBase,
  job,
  isToday,
  isSelected,
  footer,
}: {
  hrefBase: string;
  job: PilotJob;
  isToday?: boolean;
  isSelected?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <Link href={`${hrefBase}/${job.id}`} className="block">
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-colors",
          isSelected ? "border-primary ring-1 ring-primary" : "border-border hover:bg-muted/40"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-heading text-base font-semibold">{job.unitLabel}</h3>
            <p className="text-sm text-muted-foreground">{job.propertyName}</p>
          </div>
          {isToday ? (
            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              Today
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="size-4" />
            Checkout {job.checkoutTime}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-4" />
            Est. {job.expectedHours} hrs
          </span>
        </div>

        {footer}

        <div className="flex items-center justify-center gap-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground">
          View job
          <ChevronRight className="size-4" />
        </div>
      </div>
    </Link>
  );
}
