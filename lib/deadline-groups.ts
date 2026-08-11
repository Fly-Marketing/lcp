export interface DeadlineGroup<T> {
  label: string;
  items: T[];
}

export type UrgencySeverity = "occupied" | "critical" | "high" | "medium" | "low";

export interface UrgencyTag {
  label: string;
  severity: UrgencySeverity;
}

/**
 * Determines the single urgency tag for a job card:
 * - Still occupied (checkout hasn't happened yet): "Occupied", distinct color.
 * - Checked out, same-day turnover (checkout date === next check-in date): "Same day", most severe.
 * - Checked out, N days until next check-in: "N days left", severity increasing as N shrinks.
 * Returns null if there isn't enough date info to compute a tag.
 */
export function getUrgencyTag(
  checkoutDate?: string,
  nextCheckinDate?: string
): UrgencyTag | null {
  if (!checkoutDate) return null;

  const daysToCheckout = daysUntil(checkoutDate);
  const isOccupied = daysToCheckout > 0;

  if (isOccupied) {
    return { label: "Occupied", severity: "occupied" };
  }

  if (!nextCheckinDate) return null;

  if (checkoutDate === nextCheckinDate) {
    return { label: "Same day", severity: "critical" };
  }

  // Inclusive count: the checkout day counts as day 1, the next check-in day counts as the last day.
  const daysToNextCheckin = daysBetween(checkoutDate, nextCheckinDate) + 1;
  if (daysToNextCheckin <= 1) {
    return { label: "Same day", severity: "critical" };
  }

  const label = `${daysToNextCheckin} days left`;
  const severity: UrgencySeverity =
    daysToNextCheckin <= 2 ? "critical" : daysToNextCheckin <= 3 ? "high" : daysToNextCheckin <= 5 ? "medium" : "low";

  return { label, severity };
}

export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return daysBetween(today, dateStr);
}

/** Whole calendar days from `from` to `to` (both YYYY-MM-DD strings or Dates), ignoring time-of-day. */
function daysBetween(from: string | Date, to: string | Date): number {
  const start = typeof from === "string" ? parseDateOnly(from) : from;
  const end = typeof to === "string" ? parseDateOnly(to) : to;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function labelForDaysUntil(days: number): string {
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

/**
 * Groups items by their deadlineDate into labeled, soonest-first buckets.
 * Items without a deadlineDate are collected into a trailing "No deadline set" group.
 */
export function groupByDeadline<T extends { deadlineDate?: string }>(
  items: T[]
): DeadlineGroup<T>[] {
  const byDate = new Map<string, T[]>();
  const noDeadline: T[] = [];

  for (const item of items) {
    if (!item.deadlineDate) {
      noDeadline.push(item);
      continue;
    }
    const list = byDate.get(item.deadlineDate) ?? [];
    list.push(item);
    byDate.set(item.deadlineDate, list);
  }

  const groups: DeadlineGroup<T>[] = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, groupItems]) => ({
      label: labelForDaysUntil(daysUntil(date)),
      items: groupItems,
    }));

  if (noDeadline.length > 0) {
    groups.push({ label: "No deadline set", items: noDeadline });
  }

  return groups;
}
