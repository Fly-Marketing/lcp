"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Fuel } from "lucide-react";

import { Button } from "@/components/ui/button";
import { JobCard } from "@/components/jobs/job-card";
import { useMockStore } from "@/lib/mock-store";
import type { BundleSuggestion } from "@/lib/bundle-suggestions";

const BUNDLE_COLORS = [
  { border: "border-blue-500", badgeBg: "bg-blue-500", text: "text-blue-500", buttonBg: "bg-blue-700 hover:bg-blue-800", calloutBg: "bg-blue-500/5" },
  { border: "border-teal-500", badgeBg: "bg-teal-500", text: "text-teal-500", buttonBg: "bg-teal-700 hover:bg-teal-800", calloutBg: "bg-teal-500/5" },
  { border: "border-violet-500", badgeBg: "bg-violet-500", text: "text-violet-500", buttonBg: "bg-violet-700 hover:bg-violet-800", calloutBg: "bg-violet-500/5" },
  { border: "border-rose-500", badgeBg: "bg-rose-500", text: "text-rose-500", buttonBg: "bg-rose-700 hover:bg-rose-800", calloutBg: "bg-rose-500/5" },
  { border: "border-amber-500", badgeBg: "bg-amber-500", text: "text-amber-500", buttonBg: "bg-amber-700 hover:bg-amber-800", calloutBg: "bg-amber-500/5" },
];

function colorFor(index: number) {
  return BUNDLE_COLORS[index % BUNDLE_COLORS.length];
}

export function BundleSuggestionCard({ bundle }: { bundle: BundleSuggestion }) {
  const { claimJobs, employee } = useMockStore();
  const router = useRouter();
  const [claiming, setClaiming] = useState(false);
  const color = colorFor(bundle.colorIndex);

  const openJobs = bundle.jobs.filter((job) => job.status === "open");
  const allClaimed = openJobs.length === 0;

  async function handleClaimBundle() {
    setClaiming(true);
    const result = await claimJobs(openJobs.map((job) => job.id));
    if (!result.success) {
      setClaiming(false);
      return;
    }
    router.push(`/jobs/${bundle.jobs[0].id}`);
  }

  return (
    <div className={`relative rounded-2xl border-2 ${color.border} p-4 pt-24`}>
      <div
        className={`absolute left-4 top-4 inline-flex max-w-[calc(100%-11rem)] items-start gap-1.5 rounded-lg border ${color.border}/30 ${color.calloutBg} px-2.5 py-2 text-xs text-muted-foreground`}
      >
        <Fuel className={`mt-0.5 size-3.5 shrink-0 ${color.text}`} />
        <p>Bundled at the same property — save on gas by doing these in one trip.</p>
      </div>

      <div
        className={`absolute -right-px -top-px flex items-center gap-3 rounded-bl-xl rounded-tr-[calc(theme(borderRadius.2xl)-2px)] border-b-2 border-l-2 ${color.border} ${color.badgeBg} px-3 py-2.5 text-white`}
      >
        <div className="whitespace-nowrap leading-none">
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-90">
            {bundle.bundleLabel}
          </p>
          {employee.showPrices ? (
            <p className="mt-1 text-base font-bold">${bundle.totalPay}</p>
          ) : null}
          <p className="mt-0.5 text-xs opacity-90">{bundle.jobs.length} units</p>
        </div>
        {!allClaimed ? (
          <Button
            size="sm"
            className={`h-8 bg-white px-3 text-xs hover:bg-white/90 ${color.text}`}
            disabled={claiming}
            onClick={handleClaimBundle}
          >
            {claiming ? "Claiming..." : "Claim All"}
          </Button>
        ) : null}
      </div>

      <div className="space-y-3">
        {bundle.jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            showClaim
            claimButtonClassName={`${color.buttonBg} text-white`}
          />
        ))}
      </div>
    </div>
  );
}
