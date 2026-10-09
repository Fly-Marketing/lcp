import { Calendar, MapPin, Clock, KeyRound, AlertTriangle, Sparkles } from "lucide-react";

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
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>{job.address}</span>
        </div>
        <div className="flex items-start gap-2">
          <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            Checkout {job.checkoutDate} at {job.checkoutTime}
            {job.nextCheckInDate ? ` · Next guest ${job.nextCheckInDate}` : ""}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>Approx. {job.expectedHours} hrs</span>
        </div>

        {job.accessInstructions ? (
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-2">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>{job.accessInstructions}</span>
          </div>
        ) : null}

        {job.specialRequirements ? (
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-2">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>{job.specialRequirements}</span>
          </div>
        ) : null}

        {job.importantNotes ? (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-amber-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{job.importantNotes}</span>
          </div>
        ) : null}

        {children}
      </CardContent>
    </Card>
  );
}
