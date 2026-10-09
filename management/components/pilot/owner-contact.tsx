import { Phone, MessageSquare, TriangleAlert } from "lucide-react";
import type { PilotJob } from "@/lib/pilot/types";

// Matches the E.164 normalization already used in the production dispatch
// workflow (n8n "Build Recipient List" code node) — last 10 digits, +1 prefix.
function toE164(mobile: string): string | null {
  const digits = mobile.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return null;
  return `+1${digits}`;
}

export function OwnerContact({ job }: { job: PilotJob }) {
  const e164 = job.ownerMobile ? toE164(job.ownerMobile) : null;

  if (!job.ownerMobile || !e164) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <TriangleAlert className="size-4 shrink-0" />
        <span>Owner contact not available yet. Report through the form below, or reach out to LCP directly.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
      <p className="text-xs font-medium text-amber-900">
        Something wrong right now? Reach {job.ownerName ?? "the owner"} directly.
      </p>
      <div className="flex gap-2">
        <a
          href={`tel:${e164}`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-600 py-2 text-sm font-medium text-white"
        >
          <Phone className="size-4" />
          Call
        </a>
        <a
          href={`sms:${e164}`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-600 bg-white py-2 text-sm font-medium text-amber-700"
        >
          <MessageSquare className="size-4" />
          Text
        </a>
      </div>
    </div>
  );
}
