import { daysUntil, labelForDaysUntil } from "@/lib/deadline-groups";
import type { CleaningJob } from "@/lib/types";

export interface BundleSuggestion {
  key: string;
  propertyName: string;
  checkoutDate: string;
  dayLabel: string;
  jobs: CleaningJob[];
  totalPay: number;
  /** "Bundle A", "Bundle B", ... assigned in soonest-first order across the page. */
  bundleLabel: string;
  /** Index into the bundle color palette, assigned in the same soonest-first order. */
  colorIndex: number;
}

function bundleLetterFor(index: number): string {
  return String.fromCharCode(65 + (index % 26));
}

/**
 * Partitions open jobs into recommended same-trip bundles (2+ jobs sharing a
 * property and checkout date) and the remaining unbundled jobs. Solo jobs
 * (no other job matching property + day) are left out of bundles entirely.
 */
export function getBundleSuggestions(jobs: CleaningJob[]): {
  bundles: BundleSuggestion[];
  soloJobs: CleaningJob[];
} {
  const byKey = new Map<string, CleaningJob[]>();

  for (const job of jobs) {
    if (!job.deadlineDate || !job.propertyName) continue;
    const key = `${job.propertyName}|${job.deadlineDate}`;
    const list = byKey.get(key) ?? [];
    list.push(job);
    byKey.set(key, list);
  }

  const bundles: BundleSuggestion[] = [];
  const bundledJobIds = new Set<string>();

  for (const [key, groupJobs] of byKey) {
    if (groupJobs.length < 2) continue;
    const [propertyName, checkoutDate] = key.split("|");
    bundles.push({
      key,
      propertyName,
      checkoutDate,
      dayLabel: labelForDaysUntil(daysUntil(checkoutDate)),
      jobs: groupJobs,
      totalPay: groupJobs.reduce((sum, job) => sum + job.pay, 0),
      bundleLabel: "",
      colorIndex: 0,
    });
    for (const job of groupJobs) bundledJobIds.add(job.id);
  }

  bundles.sort((a, b) => a.checkoutDate.localeCompare(b.checkoutDate));
  bundles.forEach((bundle, index) => {
    bundle.bundleLabel = `Bundle ${bundleLetterFor(index)}`;
    bundle.colorIndex = index;
  });

  const soloJobs = jobs.filter((job) => !bundledJobIds.has(job.id));

  return { bundles, soloJobs };
}

export interface AvailableWorkDaySection {
  dayLabel: string;
  checkoutDate: string;
  bundles: BundleSuggestion[];
  soloJobs: CleaningJob[];
}

/**
 * Merges bundle suggestions and solo jobs into a single soonest-first sequence
 * of day sections, so a same-day solo job never renders below a later bundle.
 * Jobs without a deadlineDate are collected into a trailing section.
 */
export function groupAvailableWorkByDay(jobs: CleaningJob[]): AvailableWorkDaySection[] {
  const { bundles, soloJobs } = getBundleSuggestions(jobs);

  const byDate = new Map<
    string,
    { bundles: BundleSuggestion[]; soloJobs: CleaningJob[] }
  >();
  const noDeadline: CleaningJob[] = [];

  for (const bundle of bundles) {
    const entry = byDate.get(bundle.checkoutDate) ?? { bundles: [], soloJobs: [] };
    entry.bundles.push(bundle);
    byDate.set(bundle.checkoutDate, entry);
  }

  for (const job of soloJobs) {
    if (!job.deadlineDate) {
      noDeadline.push(job);
      continue;
    }
    const entry = byDate.get(job.deadlineDate) ?? { bundles: [], soloJobs: [] };
    entry.soloJobs.push(job);
    byDate.set(job.deadlineDate, entry);
  }

  const sections: AvailableWorkDaySection[] = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([checkoutDate, entry]) => ({
      dayLabel: labelForDaysUntil(daysUntil(checkoutDate)),
      checkoutDate,
      bundles: entry.bundles,
      soloJobs: entry.soloJobs,
    }));

  if (noDeadline.length > 0) {
    sections.push({
      dayLabel: "No deadline set",
      checkoutDate: "",
      bundles: [],
      soloJobs: noDeadline,
    });
  }

  return sections;
}
