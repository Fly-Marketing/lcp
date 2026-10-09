import Link from "next/link";
import { Calendar, ChevronRight } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
      <Card
        className={`transition-colors active:bg-muted/50 ${isToday ? "border-primary/40" : ""}`}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{job.unitLabel}</CardTitle>
            {isToday ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Today
              </span>
            ) : null}
          </div>
          <CardDescription>{job.propertyName}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex items-start gap-2 text-muted-foreground">
            <Calendar className="mt-0.5 size-4 shrink-0" />
            <span>
              Checkout {job.checkoutDate} at {job.checkoutTime}
            </span>
          </div>

          {footer}

          <div className="flex items-center justify-center gap-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground">
            View job
            <ChevronRight className="size-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
