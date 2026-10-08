"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UrgencyBadge } from "@/components/jobs/urgency-badge";
import { getUrgencyTag } from "@/lib/deadline-groups";
import { useMockStore } from "@/lib/mock-store";
import { cn } from "@/lib/utils";
import type { CleaningJob } from "@/lib/types";

export function JobCard({
  job,
  showClaim = false,
}: {
  job: CleaningJob;
  showClaim?: boolean;
}) {
  const { claimJob, employee } = useMockStore();
  const router = useRouter();
  const [claiming, setClaiming] = useState(false);
  const claimed = job.status !== "open";
  const urgencyTag = getUrgencyTag(job.deadlineDate, job.nextCheckinDate);

  async function handleClaim() {
    setClaiming(true);
    const result = await claimJob(job.id);
    if (result.success) {
      router.push(`/jobs/${job.id}`);
      return;
    }
    setClaiming(false);
  }

  const content = (
    <Card className="gap-3 border-slate-300 p-4 dark:border-slate-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground">{job.unitLabel}</h3>
            {urgencyTag ? <UrgencyBadge tag={urgencyTag} /> : null}
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            {job.area}
          </p>
        </div>
        {employee.showPrices && job.pay > 0 ? (
          <p className="shrink-0 font-semibold text-foreground">${job.pay}</p>
        ) : null}
      </div>

      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Clock className="size-3.5" />
        {job.cleaningWindow} · {job.deadline}
      </p>

      {showClaim ? (
        <Button
          className="mt-1 w-full"
          size="lg"
          disabled={claiming || claimed}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void handleClaim();
          }}
        >
          {claimed ? "Claimed" : claiming ? "Claiming..." : "Claim"}
        </Button>
      ) : null}
    </Card>
  );

  if (showClaim) {
    return content;
  }

  return (
    <Link href={`/jobs/${job.id}`} className={cn("block")}>
      {content}
    </Link>
  );
}
