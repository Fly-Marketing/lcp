"use client";

import { Calendar, MapPin, Clock, KeyRound, AlertTriangle, Sparkles } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{job.unitLabel}</DialogTitle>
          <DialogDescription>{job.propertyName}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm">
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
      </DialogContent>
    </Dialog>
  );
}
