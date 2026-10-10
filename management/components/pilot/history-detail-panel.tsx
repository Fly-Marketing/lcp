import Link from "next/link";
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  TriangleAlert,
  FileWarning,
} from "lucide-react";

import type { PilotJob, PilotReport } from "@/lib/pilot/types";

export function HistoryDetailPanel({
  token,
  job,
  reports,
  showBackLink,
}: {
  token: string;
  job: PilotJob;
  reports: PilotReport[];
  showBackLink?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {showBackLink ? (
        <Link
          href={`/pilot/history/${token}`}
          className="flex items-center gap-1 text-sm text-muted-foreground md:hidden"
        >
          <ChevronLeft className="size-4" />
          Back to history
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
          {job.completedAt ? ` ${new Date(job.completedAt).toLocaleString()}` : ""}
        </span>
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
          </span>
        </div>
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>Approx. {job.expectedHours} hrs</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Reports {reports.length > 0 ? `(${reports.length})` : ""}
        </h2>

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
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                    {report.category}
                  </span>
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

                {report.photoUrls.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {report.photoUrls.map((url) => (
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
                  {new Date(report.createdAt).toLocaleString()} · {report.status}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
