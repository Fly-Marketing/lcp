"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  TriangleAlert,
  FileWarning,
  Pencil,
  Plus,
  Loader2,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReportProblemDialog } from "@/components/pilot/report-problem-dialog";
import { deleteReport, updateCompletedJob } from "@/lib/pilot/actions";
import type { PilotJob, PilotReport } from "@/lib/pilot/types";

function formatEdmontonDateTime(dateIso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Edmonton",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateIso));
}

export function HistoryDetailPanel({
  job,
  reports,
  showBackLink,
  backHref,
}: {
  job: PilotJob;
  reports: PilotReport[];
  showBackLink?: boolean;
  backHref: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [editedAt, setEditedAt] = useState<string | null>(null);
  const [cleanResult, setCleanResult] = useState(
    ["Completed", "Needs attention", "Not clean"].includes(job.status)
      ? job.status
      : "Completed"
  );
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportToEdit, setReportToEdit] = useState<PilotReport | null>(null);

  function cancelEditing() {
    setCleanResult(
      ["Completed", "Needs attention", "Not clean"].includes(job.status)
        ? job.status
        : "Completed"
    );
    setIsEditing(false);
  }

  function saveJobChanges() {
    startTransition(async () => {
      const result = await updateCompletedJob(job.id, cleanResult);
      if (!result.success) {
        toast.error(result.message ?? "Failed to update completed job");
        return;
      }
      setEditedAt(new Date().toISOString());
      setIsEditing(false);
      toast.success("Completed job updated");
      router.refresh();
    });
  }

  function addReport() {
    setReportToEdit(null);
    setShowReportDialog(true);
  }

  function editReport(report: PilotReport) {
    setReportToEdit(report);
    setShowReportDialog(true);
  }

  function removeReport(report: PilotReport) {
    if (!window.confirm("Remove this report? This cannot be undone.")) return;

    startTransition(async () => {
      const result = await deleteReport(report.id);
      if (!result.success) {
        toast.error(result.message ?? "Failed to remove report");
        return;
      }
      setEditedAt(new Date().toISOString());
      toast.success("Report removed");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {showBackLink ? (
        <Link
          href={backHref}
          className="flex items-center gap-1 text-sm text-muted-foreground md:hidden"
        >
          <ChevronLeft className="size-4" />
          Back to my jobs
        </Link>
      ) : null}

      <div>
        <h1 className="font-heading text-2xl font-medium">{job.unitLabel}</h1>
        <p className="text-muted-foreground">{job.propertyName}</p>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        <CheckCircle2 className="size-4 shrink-0" />
        <span>
          Completed
          {job.completedAt ? ` ${formatEdmontonDateTime(job.completedAt)}` : ""}
        </span>
      </div>

      {editedAt ? (
        <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          <Pencil className="size-4 shrink-0" />
          <span>Edited {formatEdmontonDateTime(editedAt)}</span>
        </div>
      ) : null}

      <Button
        type="button"
        size="lg"
        onClick={() => setIsEditing(true)}
        disabled={isEditing}
        className="w-full"
      >
        <Pencil className="size-4" />
        {isEditing ? "Editing completed clean" : "Edit completed clean"}
      </Button>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-sm">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>{job.address}</span>
        </div>
        <div className="flex items-start gap-2">
          <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            Checkout {job.checkoutDate} at {job.checkoutTime}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>Approx. {job.expectedHours} hrs</span>
        </div>
      </div>

      {isEditing ? (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex flex-col gap-1.5">
            <Label>Cleaning result</Label>
            <Select value={cleanResult} onValueChange={setCleanResult}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Completed">Clean and completed</SelectItem>
                <SelectItem value="Needs attention">Needs attention</SelectItem>
                <SelectItem value="Not clean">Not clean</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={cancelEditing} disabled={isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={saveJobChanges} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save changes
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Reports {reports.length > 0 ? `(${reports.length})` : ""}
          </h2>
          {isEditing ? (
            <Button type="button" size="sm" variant="outline" onClick={addReport}>
              <Plus className="size-3.5" />
              Add report
            </Button>
          ) : null}
        </div>

        {reports.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            No problems reported for this clean.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                    {report.category}
                  </span>
                  <div className="flex items-center gap-2">
                    {report.urgent ? (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                        <TriangleAlert className="size-3.5" />
                        Urgent
                      </span>
                    ) : null}
                    {isEditing ? (
                      <>
                        <Button type="button" size="xs" variant="ghost" onClick={() => editReport(report)}>
                          <Pencil className="size-3" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="destructive"
                          aria-label="Remove report"
                          disabled={isPending}
                          onClick={() => removeReport(report)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </>
                    ) : null}
                  </div>
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

                <p className="text-xs text-muted-foreground">
                  {formatEdmontonDateTime(report.createdAt)} · {report.status}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <ReportProblemDialog
        key={reportToEdit?.id ?? "new-report"}
        jobId={job.id}
        unitLabel={job.unitLabel}
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        initialReport={reportToEdit}
        onSubmitted={() => {
            setEditedAt(new Date().toISOString());
          router.refresh();
        }}
      />
    </div>
  );
}
