import { Badge } from "@/components/ui/badge";
import type { JobStatus } from "@/lib/types";

const STATUS_LABEL: Record<JobStatus, string> = {
  open: "Open",
  claimed: "Claimed",
  in_progress: "Cleaning in Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  exception: "Needs Attention",
};

const STATUS_CLASS: Record<JobStatus, string> = {
  open: "bg-muted text-muted-foreground",
  claimed: "bg-secondary text-secondary-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-primary/10 text-primary",
  cancelled: "bg-destructive/10 text-destructive",
  exception: "bg-destructive/10 text-destructive",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge className={STATUS_CLASS[status]} variant="secondary">
      <span
        className={
          status === "in_progress"
            ? "mr-1.5 size-1.5 rounded-full bg-primary"
            : "hidden"
        }
      />
      {STATUS_LABEL[status]}
    </Badge>
  );
}
