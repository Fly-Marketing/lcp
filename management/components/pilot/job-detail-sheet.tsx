"use client";

import { Calendar, MapPin, Clock, KeyRound, AlertTriangle, Sparkles } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { PilotJob } from "@/lib/pilot/types";

export function JobDetailSheet({
  job,
  open,
  onOpenChange,
}: {
  job: PilotJob;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{job.unitLabel}</SheetTitle>
          <SheetDescription>{job.propertyName}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4 pb-4 text-sm">
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
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
              <KeyRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>{job.accessInstructions}</span>
            </div>
          ) : null}

          {job.specialRequirements ? (
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>{job.specialRequirements}</span>
            </div>
          ) : null}

          {job.importantNotes ? (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-amber-900">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{job.importantNotes}</span>
            </div>
          ) : null}

          {!job.accessInstructions && !job.specialRequirements && !job.importantNotes ? (
            <p className="text-muted-foreground">No additional details for this unit.</p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
