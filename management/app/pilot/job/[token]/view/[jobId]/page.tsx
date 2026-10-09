import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Calendar, MapPin, Clock, KeyRound, AlertTriangle, Sparkles } from "lucide-react";

import { JobViewActions } from "@/components/pilot/job-view-actions";
import { getStaffForToken, getJobById } from "@/lib/pilot/queries";
import { hashTokenForLookup } from "@/lib/pilot/links";

export const dynamic = "force-dynamic";

export default async function PilotJobViewPage({
  params,
}: {
  params: Promise<{ token: string; jobId: string }>;
}) {
  const { token, jobId } = await params;
  const staff = await getStaffForToken(hashTokenForLookup(token), token);

  if (!staff) {
    notFound();
  }

  const job = await getJobById(jobId, staff.id);
  if (!job) {
    notFound();
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <Link
        href={`/pilot/job/${token}`}
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ChevronLeft className="size-4" />
        Back to today
      </Link>

      <div>
        <h1 className="font-heading text-2xl font-medium">{job.unitLabel}</h1>
        <p className="text-muted-foreground">{job.propertyName}</p>
      </div>

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

      <JobViewActions token={token} job={job} staffId={staff.id} />
    </div>
  );
}
