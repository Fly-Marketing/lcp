import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";

import type { PilotJob } from "@/lib/pilot/types";

export function HistoryRow({ token, job }: { token: string; job: PilotJob }) {
  return (
    <Link
      href={`/pilot/job/${token}/view/${job.id}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/40"
    >
      <div className="flex-1 overflow-hidden">
        <h3 className="truncate text-sm font-semibold">{job.unitLabel}</h3>
        <p className="truncate text-xs text-muted-foreground">{job.propertyName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {job.checkoutDate ? new Date(job.checkoutDate).toLocaleDateString() : ""}
          {job.checkoutTime ? ` · Checkout ${job.checkoutTime}` : ""}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="flex items-center gap-1 text-xs font-medium text-green-700">
          <CheckCircle2 className="size-3.5" />
          Completed
        </span>
        {job.completedAt ? (
          <span className="text-[11px] text-muted-foreground">
            {new Date(job.completedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </span>
        ) : null}
      </div>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
