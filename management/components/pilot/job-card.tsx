import Link from "next/link";
import { Calendar, Clock, ChevronRight } from "lucide-react";

import { PropertyPhoto } from "@/components/pilot/property-photo";
import type { PilotJob } from "@/lib/pilot/types";

export function PilotJobCard({
  token,
  job,
  isToday,
  footer,
}: {
  token: string;
  job: PilotJob;
  isToday?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <Link href={`/pilot/job/${token}/view/${job.id}`} className="block">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
        <div className="relative">
          <PropertyPhoto className="h-32 w-full" />
          {isToday ? (
            <span className="absolute top-2.5 right-2.5 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow">
              Today
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 p-4">
          <div>
            <h3 className="font-heading text-base font-semibold">{job.unitLabel}</h3>
            <p className="text-sm text-muted-foreground">{job.propertyName}</p>
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
      </div>
    </Link>
  );
}
