"use client";

import { use, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronLeft,
  Clock,
  KeyRound,
  MapPin,
  Navigation,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { JobInfoSection } from "@/components/jobs/job-info-section";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { UrgencyBadge } from "@/components/jobs/urgency-badge";
import {
  CompletionChecklist,
  type CompletionItem,
} from "@/components/jobs/completion-checklist";
import { getUrgencyTag } from "@/lib/deadline-groups";
import { useMockStore } from "@/lib/mock-store";

export default function JobDetailPage({ params }: PageProps<"/jobs/[id]">) {
  const { id } = use(params);
  const router = useRouter();
  const { getJob, startClean, employee } = useMockStore();

  const job = getJob(id);
  if (!job) {
    notFound();
  }
  const jobId = job.id;

  const [starting, setStarting] = useState(false);
  const [standardCleanDone, setStandardCleanDone] = useState(false);
  const [specialDone, setSpecialDone] = useState<Record<string, boolean>>({});

  const items: CompletionItem[] = [
    {
      id: "standard-clean",
      title: "Standard Clean",
      description:
        "Confirm the standard LCP cleaning procedure has been completed.",
      checked: standardCleanDone,
    },
    ...job.specialRequirements.map((requirement, index) => ({
      id: `special-${index}`,
      title: requirement,
      checked: specialDone[`special-${index}`] ?? false,
    })),
  ];

  function toggleItem(itemId: string, checked: boolean) {
    if (itemId === "standard-clean") {
      setStandardCleanDone(checked);
    } else {
      setSpecialDone((prev) => ({ ...prev, [itemId]: checked }));
    }
  }

  const allChecked = items.every((item) => item.checked);
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    job.address
  )}`;
  const urgencyTag = getUrgencyTag(job.deadlineDate, job.nextCheckinDate);

  async function handleStartClean() {
    setStarting(true);
    await startClean(jobId);
    setStarting(false);
  }

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground"
      >
        <ChevronLeft className="size-4" />
        Back
      </button>

      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {job.unitLabel}
          </h1>
          <p className="text-sm text-muted-foreground">{job.propertyName}</p>
        </div>
        {employee.showPrices && job.pay > 0 ? (
          <p className="text-xl font-semibold text-foreground">${job.pay}</p>
        ) : null}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <JobStatusBadge status={job.status} />
        {urgencyTag ? <UrgencyBadge tag={urgencyTag} /> : null}
      </div>

      <div className="space-y-3">
        <JobInfoSection icon={MapPin} label="Location">
          <p>{job.address}</p>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-primary"
          >
            <Navigation className="size-3.5" />
            Directions
          </a>
        </JobInfoSection>

        <JobInfoSection icon={Clock} label="Schedule">
          <p>Cleaning window {job.cleaningWindow}</p>
          {job.deadlineDate ? <p>Checkout: {job.deadlineDate}</p> : null}
          {job.nextCheckinDate ? (
            <p>Next check-in: {job.nextCheckinDate}</p>
          ) : null}
          <p>{job.deadline}</p>
        </JobInfoSection>

        <JobInfoSection icon={KeyRound} label="Access">
          <p>{job.access}</p>
        </JobInfoSection>

        {job.important ? (
          <JobInfoSection icon={AlertTriangle} label="Important">
            <p>{job.important}</p>
          </JobInfoSection>
        ) : null}

        {job.specialRequirements.length > 0 ? (
          <JobInfoSection icon={Sparkles} label="Special Cleaning">
            <ul className="space-y-1">
              {job.specialRequirements.map((requirement) => (
                <li key={requirement}>{requirement}</li>
              ))}
            </ul>
          </JobInfoSection>
        ) : null}
      </div>

      {job.status === "in_progress" || job.status === "completed" ? (
        <div className="mt-4">
          <CompletionChecklist items={items} onToggle={toggleItem} />
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {job.status === "claimed" ? (
          <Button
            size="lg"
            className="w-full"
            disabled={starting}
            onClick={handleStartClean}
          >
            {starting ? "Starting..." : "Start Clean"}
          </Button>
        ) : null}

        {job.status === "in_progress" ? (
          <Button
            size="lg"
            className="w-full"
            disabled={!allChecked}
            onClick={() => router.push(`/jobs/${jobId}/complete`)}
          >
            {allChecked ? "Complete Clean" : "Finish checklist to complete"}
          </Button>
        ) : null}

        {job.status !== "completed" ? (
          <Button
            variant="ghost"
            className="w-full text-primary"
            onClick={() => router.push(`/report?jobId=${jobId}`)}
          >
            Report Problem
          </Button>
        ) : null}
      </div>
    </div>
  );
}
