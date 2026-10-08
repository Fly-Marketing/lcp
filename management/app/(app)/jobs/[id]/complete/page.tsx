"use client";

import { use, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { ChevronLeft, MapPin, Navigation, PartyPopper } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMockStore } from "@/lib/mock-store";

export default function CompleteCleanPage({
  params,
}: PageProps<"/jobs/[id]/complete">) {
  const { id } = use(params);
  const router = useRouter();
  const { getJob, jobsForRoute, getRoute, completeClean, employee } = useMockStore();

  const job = getJob(id);
  if (!job) {
    notFound();
  }
  const jobId = job.id;

  const [stage, setStage] = useState<"confirm" | "next" | "route-complete">(
    "confirm"
  );
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const route = job.routeId ? getRoute(job.routeId) : undefined;
  const routeJobs = job.routeId ? jobsForRoute(job.routeId) : [];

  async function handleComplete() {
    setSubmitting(true);
    await completeClean(jobId, note || undefined);
    setSubmitting(false);

    if (!route) {
      router.push("/work");
      return;
    }

    const remaining = routeJobs.filter(
      (j) => j.id !== jobId && j.status !== "completed"
    );
    setStage(remaining.length > 0 ? "next" : "route-complete");
  }

  if (stage === "next" && route) {
    const nextJob = routeJobs.find(
      (j) => j.id !== jobId && j.status !== "completed"
    );
    const completedCount = routeJobs.filter(
      (j) => j.status === "completed" || j.id === jobId
    ).length;
    const directionsUrl = nextJob
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          nextJob.address
        )}`
      : undefined;

    return (
      <div>
        <div className="rounded-xl border border-border bg-card p-5 text-center">
          <p className="font-semibold text-foreground">
            {job.unitLabel} Complete
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {completedCount} of {routeJobs.length} cleans finished
          </p>
        </div>

        {nextJob ? (
          <div className="mt-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Next
            </h2>
            <div className="rounded-xl border border-primary bg-primary/5 p-4">
              <p className="font-semibold text-foreground">
                {nextJob.unitLabel}
              </p>
              <p className="text-sm text-muted-foreground">
                {nextJob.propertyName}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-3.5" />
                {nextJob.address}
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {directionsUrl ? (
                <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="lg" className="w-full">
                    <Navigation className="size-4" />
                    Directions
                  </Button>
                </a>
              ) : null}
              <Button
                size="lg"
                className="w-full"
                onClick={() => router.push(`/jobs/${nextJob.id}`)}
              >
                Start Next Clean
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (stage === "route-complete" && route) {
    const completedAt = new Date().toLocaleTimeString("en-CA", {
      hour: "numeric",
      minute: "2-digit",
    });
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <PartyPopper className="size-7" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-foreground">
          Route Complete
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {routeJobs.length} cleans completed
        </p>
        {employee.showPrices && route.totalPay > 0 ? (
          <p className="mt-1 text-2xl font-semibold text-foreground">
            ${route.totalPay}
          </p>
        ) : null}
        <p className="mt-1 text-sm text-muted-foreground">
          Completed at {completedAt}
        </p>
        <Button size="lg" className="mt-8 w-full" onClick={() => router.push("/work")}>
          Done
        </Button>
      </div>
    );
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

      <h1 className="text-xl font-semibold text-foreground">
        Complete {job.unitLabel}
      </h1>
      <p className="text-sm text-muted-foreground">{job.propertyName}</p>

      <div className="mt-5 rounded-xl border border-border bg-card p-4">
        <p className="font-medium text-foreground">Checklist status</p>
        <p className="mt-1 text-sm text-muted-foreground">
          All required completion items confirmed.
        </p>
      </div>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor="note">Completion note (optional)</Label>
        <Textarea
          id="note"
          placeholder="Anything the office should know?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <button
        type="button"
        className="mt-4 flex w-full items-center justify-center rounded-xl border border-dashed border-border py-4 text-sm text-muted-foreground"
      >
        Add optional photos
      </button>

      <button
        type="button"
        onClick={() => router.push(`/report?jobId=${jobId}`)}
        className="mt-4 block text-center text-sm font-medium text-primary"
      >
        Report Problem
      </button>

      <Button
        size="lg"
        className="mt-6 w-full"
        disabled={submitting}
        onClick={handleComplete}
      >
        {submitting ? "Completing..." : "Mark Clean Complete"}
      </Button>
    </div>
  );
}
