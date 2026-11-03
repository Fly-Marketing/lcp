"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  DollarSign,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  CircleDot,
  Clock,
  FileWarning,
  KeyRound,
  MapPin,
  MessageSquareWarning,
  TriangleAlert,
  User,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { resolveReport, updateCompletedJob } from "@/lib/pilot/actions";
import type { OwnerStatus } from "@/lib/pilot/status";
import type { PilotJob, PilotReport } from "@/lib/pilot/types";

const STATUS_STYLE: Record<OwnerStatus, { cls: string; icon: typeof CircleDot }> = {
  Scheduled: { cls: "border-blue-200 bg-blue-50 text-blue-800", icon: Calendar },
  Accepted: { cls: "border-blue-200 bg-blue-50 text-blue-800", icon: CircleDot },
  Clean: { cls: "border-green-200 bg-green-50 text-green-800", icon: CheckCircle2 },
  Flagged: { cls: "border-amber-200 bg-amber-50 text-amber-900", icon: TriangleAlert },
  Cancelled: { cls: "border-red-200 bg-red-50 text-red-800", icon: XCircle },
};

export function StaffJobPanel({
  job,
  status,
  reports,
  showPrice,
  canSetResult,
  canResolve,
  backHref,
}: {
  job: PilotJob;
  status: OwnerStatus;
  reports: PilotReport[];
  showPrice: boolean;
  canSetResult: boolean;
  canResolve: boolean;
  backHref: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState(
    ["Completed", "Needs attention", "Not clean"].includes(job.status) ? job.status : "Completed"
  );
  const S = STATUS_STYLE[status];

  function saveResult() {
    startTransition(async () => {
      const r = await updateCompletedJob(job.id, result);
      if (!r.success) return void toast.error(r.message);
      toast.success("Result updated");
      router.refresh();
    });
  }

  function resolve(reportId: string) {
    startTransition(async () => {
      const r = await resolveReport(reportId);
      if (!r.success) return void toast.error(r.message);
      toast.success("Report resolved");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href={backHref} className="flex items-center gap-1 text-sm text-muted-foreground md:hidden">
        <ChevronLeft className="size-4" />
        Back to jobs
      </Link>

      <div>
        <h1 className="font-heading text-2xl font-medium">{job.unitLabel}</h1>
        <p className="text-muted-foreground">{job.propertyName}</p>
      </div>

      <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${S.cls}`}>
        <S.icon className="size-4" />
        {status}
        {status === "Scheduled" ? " · awaiting acceptance" : ""}
        {status === "Accepted" && job.assignedCleanerName ? ` by ${job.assignedCleanerName}` : ""}
      </div>

      {job.specialRequest ? (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          <MessageSquareWarning className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="text-xs font-medium">Special request</p>
            <p>{job.specialRequest}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-sm">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>{job.address}</span>
        </div>
        <div className="flex items-start gap-2">
          <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            Checkout {job.checkoutDate}
            {job.checkoutTime ? ` at ${job.checkoutTime}` : ""}
            {job.nextCheckInDate ? ` · Next guest ${job.nextCheckInDate}` : ""}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>Approx. {job.expectedHours} hrs</span>
        </div>
        {job.assignedCleanerName ? (
          <div className="flex items-start gap-2">
            <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>Cleaner: {job.assignedCleanerName}</span>
          </div>
        ) : null}
      </div>

      {showPrice ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm">
          <DollarSign className="size-4 shrink-0 text-muted-foreground" />
          <span>Price</span>
          <span className={job.price != null ? "ml-auto" : "ml-auto text-muted-foreground"}>
            {job.price != null ? `$${job.price.toFixed(2)}` : "Not set"}
          </span>
        </div>
      ) : null}

      {job.accessInstructions ? (
        <div className="flex items-start gap-2 rounded-xl bg-muted/50 p-4 text-sm">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>{job.accessInstructions}</span>
        </div>
      ) : null}
      {job.importantNotes ? (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{job.importantNotes}</span>
        </div>
      ) : null}

      {canSetResult && job.completedAt ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
          <Label>Cleaning result</Label>
          <Select value={result} onValueChange={setResult}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Completed">Clean and completed</SelectItem>
              <SelectItem value="Needs attention">Needs attention</SelectItem>
              <SelectItem value="Not clean">Not clean</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" disabled={isPending} onClick={saveResult}>
            Save result
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Reports {reports.length > 0 ? `(${reports.length})` : ""}
        </h2>
        {reports.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            No problems reported for this clean.
          </p>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{report.category}</span>
                {report.urgent ? (
                  <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    <TriangleAlert className="size-3.5" />
                    Urgent
                  </span>
                ) : null}
              </div>
              <p className="flex items-start gap-2">
                <FileWarning className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>{report.description}</span>
              </p>
              {report.photos.some((p) => p.url) ? (
                <div className="flex flex-wrap gap-2">
                  {report.photos.flatMap((p) => (p.url ? [p.url] : [])).map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-border bg-muted px-2 py-1 text-xs text-muted-foreground underline"
                    >
                      Photo
                    </a>
                  ))}
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {new Date(report.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })} ·{" "}
                  {report.resolvedAt ? "Resolved" : report.status}
                </p>
                {canResolve && !report.resolvedAt ? (
                  <Button size="xs" variant="outline" disabled={isPending} onClick={() => resolve(report.id)}>
                    Mark resolved
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
