"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { managerUpdateJob } from "@/lib/pilot/actions";

const selectCls = "h-8 rounded-lg border border-input bg-background px-2 text-sm";

// Manager override for one job: mark done, assign a cleaner, or archive it.
export function ManagerJobActions({
  jobId,
  cleaners,
  assignedStaffId,
  done,
  archived,
}: {
  jobId: string;
  cleaners: { staffId: string; name: string }[];
  assignedStaffId: string | null;
  done: boolean;
  archived: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [staffId, setStaffId] = useState(assignedStaffId ?? "");

  function run(patch: Parameters<typeof managerUpdateJob>[1], ok: string) {
    startTransition(async () => {
      const r = await managerUpdateJob(jobId, patch);
      if (!r.success) return void toast.error(r.message);
      toast.success(ok);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-semibold">Manager actions</p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={selectCls}
          aria-label="Assign cleaner"
          value={staffId}
          disabled={isPending || archived}
          onChange={(e) => setStaffId(e.target.value)}
        >
          <option value="">Unassigned</option>
          {cleaners.map((c) => (
            <option key={c.staffId} value={c.staffId}>
              {c.name}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending || archived || staffId === (assignedStaffId ?? "")}
          onClick={() => run({ assignStaffId: staffId || null }, staffId ? "Cleaner assigned" : "Cleaner removed")}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save cleaner
        </Button>
        <Button
          size="sm"
          disabled={isPending || done || archived}
          onClick={() => run({ markDone: true }, "Marked done")}
        >
          Mark done
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={isPending || archived}
          onClick={() => {
            if (window.confirm("Archive this job? It will be removed from the schedule and kept in the record.")) {
              run({ archive: true }, "Job archived");
            }
          }}
        >
          Archive
        </Button>
      </div>
    </div>
  );
}
