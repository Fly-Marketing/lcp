import type { ChecklistItem } from "@/lib/pilot/types";

// Pure input validation shared by the service layer and unit tests.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function todayInEdmonton(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Edmonton",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function validateJobDate(date: string, today: string): string | null {
  if (!isValidDate(date)) return "Choose a valid date";
  if (date < today) return "Choose today or a future date";
  if (date > addDays(today, 365)) return "Choose a date within the next year";
  return null;
}

export function validateTime(time: string | null | undefined): string | null {
  if (time === null || time === undefined || time === "") return null;
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(time) ? null : "Enter the time as HH:MM";
}

export function cleanText(value: string | null | undefined, max: number): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  return v.slice(0, max);
}

export type ChecklistResult = { ok: true; items: ChecklistItem[] } | { ok: false; message: string };

export function validateChecklist(input: unknown): ChecklistResult {
  if (!Array.isArray(input)) return { ok: false, message: "Checklist must be a list" };
  if (input.length === 0 || input.length > 30) return { ok: false, message: "Use 1 to 30 checklist items" };
  const seen = new Set<string>();
  const items: ChecklistItem[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return { ok: false, message: "Invalid checklist item" };
    const r = raw as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id.trim() : "";
    const title = typeof r.title === "string" ? r.title.trim() : "";
    const description = typeof r.description === "string" ? r.description.trim() : "";
    if (!/^[a-z0-9_-]{1,40}$/.test(id)) return { ok: false, message: "Checklist item ids must be short lowercase codes" };
    if (seen.has(id)) return { ok: false, message: "Checklist item ids must be unique" };
    seen.add(id);
    if (!title || title.length > 80) return { ok: false, message: "Each checklist item needs a title (max 80 characters)" };
    if (description.length > 200) return { ok: false, message: "Checklist descriptions are limited to 200 characters" };
    items.push(description ? { id, title, description } : { id, title });
  }
  return { ok: true, items };
}

export function validatePrice(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > 100000) return null;
  return Math.round(n * 100) / 100;
}
