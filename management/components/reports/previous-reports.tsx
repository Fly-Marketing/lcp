"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { useMockStore } from "@/lib/mock-store";

export function PreviousReports() {
  const { reports, employee } = useMockStore();
  const userReports = reports.filter((r) => r.employeeName === employee.name);

  if (userReports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
        <p className="text-sm text-muted-foreground">
          You haven&apos;t submitted any reports yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {userReports.map((report) => (
        <div
          key={report.id}
          className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-secondary" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">{report.category}</p>
            {report.description && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {report.description}
              </p>
            )}
            {report.unitLabel && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Unit: {report.unitLabel}
              </p>
            )}
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3" />
              {report.createdAt}
              {report.awaitingFollowUp && (
                <span className="ml-2 rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary">
                  Awaiting follow-up
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
