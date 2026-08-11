"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Link2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { IssueCategoryPicker } from "@/components/reports/issue-category-picker";
import { useMockStore } from "@/lib/mock-store";
import { ISSUE_CATEGORIES, type IssueCategory } from "@/lib/types";

const PHOTO_EMPHASIS_CATEGORIES: IssueCategory[] = [
  "Maintenance Issue",
  "Damage / Property Concern",
];

export function ReportForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId") ?? undefined;
  const { getJob, employee, submitReport } = useMockStore();

  const job = jobId ? getJob(jobId) : undefined;

  const [category, setCategory] = useState<IssueCategory | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const photosRecommended =
    category !== null && PHOTO_EMPHASIS_CATEGORIES.includes(category);

  async function handleSubmit() {
    if (!category) return;
    setSubmitting(true);
    await submitReport({ category, description, jobId });
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="size-7" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Report Submitted
        </h2>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Your report has been recorded and linked to this job.
        </p>
      </div>
    );
  }

  return (
    <div>
      {job ? (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <Link2 className="size-5 shrink-0 text-muted-foreground" />
          <p className="min-w-0 flex-1 text-sm text-foreground">
            Linked to <span className="font-semibold">{job.unitLabel}</span>
            <span className="block text-muted-foreground">
              {employee.name} · now
            </span>
          </p>
          <button
            type="button"
            onClick={() => router.replace("/report")}
            aria-label="Remove linked job"
            title="Remove linked job"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        What is wrong?
      </h2>
      <IssueCategoryPicker
        categories={ISSUE_CATEGORIES}
        selected={category}
        onSelect={setCategory}
      />

      <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Description
      </h2>
      <Textarea
        placeholder="Briefly describe what's happening"
        rows={5}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <button
        type="button"
        className={
          "mt-4 flex w-full items-center justify-center rounded-xl border border-dashed py-4 text-sm " +
          (photosRecommended
            ? "border-primary/50 text-primary"
            : "border-border text-muted-foreground")
        }
      >
        Add optional photos
        {photosRecommended ? (
          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">
            Recommended
          </span>
        ) : null}
      </button>

      <Button
        size="lg"
        className="mt-6 w-full"
        disabled={!category || submitting}
        onClick={handleSubmit}
      >
        {submitting ? "Submitting..." : "Submit Report"}
      </Button>
    </div>
  );
}
