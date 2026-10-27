import Link from "next/link";
import { CheckCircle2, ChevronRight, CircleDot, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PilotJob } from "@/lib/pilot/types";

export function HistoryRow({
  token,
  job,
  isSelected,
}: {
  token: string;
  job: PilotJob;
  isSelected?: boolean;
}) {
  const state = job.cancelledAt ? "Cancelled" : job.completedAt ? "Completed" : "To do";
  const StateIcon = state === "Cancelled" ? XCircle : state === "Completed" ? CheckCircle2 : CircleDot;
  const stateClass =
    state === "Cancelled"
      ? "text-red-700"
      : state === "Completed"
        ? "text-green-700"
        : "text-primary";

  return (
    <Link
      href={`/pilot/history/${token}/view/${job.id}`}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors",
        isSelected ? "border-primary ring-1 ring-primary" : "border-border hover:bg-muted/40"
      )}
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
        <span className={`flex items-center gap-1 text-xs font-medium ${stateClass}`}>
          <StateIcon className="size-3.5" />
          {state}
        </span>
        {job.completedAt || job.cancelledAt ? (
          <span className="text-[11px] text-muted-foreground">
            {new Date(job.completedAt ?? job.cancelledAt ?? "").toLocaleDateString("en-CA", {
              month: "short",
              day: "numeric",
            })}
          </span>
        ) : null}
      </div>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
