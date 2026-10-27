import Link from "next/link";
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Clock,
  KeyRound,
  AlertTriangle,
  Sparkles,
  CircleDot,
  XCircle,
} from "lucide-react";

import { JobViewActions } from "@/components/pilot/job-view-actions";
import { OwnerContact } from "@/components/pilot/owner-contact";
import type { PilotJob } from "@/lib/pilot/types";

export function JobDetailPanel({
  token,
  job,
  staffId,
  showBackLink,
  backHref,
  backLabel,
}: {
  token: string;
  job: PilotJob;
  staffId: string;
  showBackLink?: boolean;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {showBackLink ? (
        <Link
          href={backHref ?? `/pilot/job/${token}`}
          className="flex items-center gap-1 text-sm text-muted-foreground md:hidden"
        >
          <ChevronLeft className="size-4" />
          {backLabel ?? "Back to today"}
        </Link>
      ) : null}

      <div>
        <h1 className="font-heading text-2xl font-medium">{job.unitLabel}</h1>
        <p className="text-muted-foreground">{job.propertyName}</p>
      </div>

      {job.cancelledAt ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          <XCircle className="size-4" />
          Cancelled
        </div>
      ) : job.status === "Claimed" ? (
        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
          <CircleDot className="size-4" />
          Current job
        </div>
      ) : null}

      {!job.cancelledAt ? <OwnerContact job={job} /> : null}

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-sm">
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
      </div>

      {job.accessInstructions ? (
        <div className="flex items-start gap-2 rounded-xl bg-muted/50 p-4 text-sm">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>{job.accessInstructions}</span>
        </div>
      ) : null}

      {job.specialRequirements ? (
        <div className="flex items-start gap-2 rounded-xl bg-muted/50 p-4 text-sm">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>{job.specialRequirements}</span>
        </div>
      ) : null}

      {job.importantNotes ? (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{job.importantNotes}</span>
        </div>
      ) : null}

      {!job.cancelledAt ? <JobViewActions token={token} job={job} staffId={staffId} /> : null}
    </div>
  );
}
