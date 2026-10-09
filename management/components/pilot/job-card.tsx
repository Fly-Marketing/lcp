import { Calendar } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { PilotJob } from "@/lib/pilot/types";

export function PilotJobCard({
  job,
  isToday,
  children,
}: {
  job: PilotJob;
  isToday?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Card className={isToday ? "border-primary/40" : undefined}>
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

        {children}
      </CardContent>
    </Card>
  );
}
