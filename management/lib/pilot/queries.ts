import "server-only";
import { getServiceClient } from "@/lib/pilot/supabase";
import { usesFakeData } from "@/lib/pilot/mode";
import {
  fakeGetStaffForToken,
  fakeGetJobsForStaff,
  fakeGetCompletedJobsForStaff,
  fakeGetJobById,
  FAKE_TOKEN,
} from "@/lib/pilot/fake-store";
import type { PilotJob } from "@/lib/pilot/types";

const JOB_SELECT =
  "id, unit_id, checkout_date, checkout_time, next_check_in_date, expected_hours, status, completed_at, cancelled_at";

const UNIT_SELECT =
  "id, unit_name, address, building_id, access_instructions, important_notes, special_requirements, buildings(name, customers(name, mobile))";

type RawCustomer = { name: string | null; mobile: string | null };

type RawBuilding = {
  name: string;
  customers: RawCustomer | RawCustomer[] | null;
};

type RawUnit = {
  id: string;
  unit_name: string | null;
  address: string | null;
  building_id: string | null;
  access_instructions: string | null;
  important_notes: string | null;
  special_requirements: string | null;
  buildings: RawBuilding | RawBuilding[] | null;
};

type RawJob = {
  id: string;
  unit_id: string | null;
  checkout_date: string | null;
  checkout_time: string | null;
  next_check_in_date: string | null;
  expected_hours: number | null;
  status: string;
  completed_at: string | null;
  cancelled_at: string | null;
};

function toPilotJob(job: RawJob, unitById: Map<string, RawUnit>): PilotJob {
  const unit = job.unit_id ? unitById.get(job.unit_id) : undefined;
  const building = Array.isArray(unit?.buildings) ? unit?.buildings[0] : unit?.buildings;
  const customer = Array.isArray(building?.customers) ? building?.customers[0] : building?.customers;

  return {
    id: job.id,
    unitLabel: unit?.unit_name ?? "Unknown unit",
    propertyName: building?.name ?? "Unknown property",
    address: unit?.address ?? "",
    checkoutDate: job.checkout_date,
    checkoutTime: job.checkout_time,
    nextCheckInDate: job.next_check_in_date,
    expectedHours: Number(job.expected_hours ?? 0),
    status: job.status,
    accessInstructions: unit?.access_instructions ?? null,
    importantNotes: unit?.important_notes ?? null,
    specialRequirements: unit?.special_requirements ?? null,
    completedAt: job.completed_at,
    ownerName: customer?.name ?? null,
    ownerMobile: customer?.mobile ?? null,
  };
}

export async function getStaffForToken(tokenHash: string, rawToken: string) {
  if (usesFakeData()) {
    return fakeGetStaffForToken(rawToken);
  }

  const supabase = getServiceClient();
  const { data: link } = await supabase
    .from("access_links")
    .select("staff_id, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .eq("persona", "cleaner")
    .maybeSingle();

  if (!link || !link.staff_id) return null;
  if (link.revoked_at) return null;
  if (new Date(link.expires_at) < new Date()) return null;

  const { data: staff } = await supabase
    .from("staff")
    .select("id, name")
    .eq("id", link.staff_id)
    .maybeSingle();

  return staff;
}

async function getUnitsForStaff(staffId: string): Promise<Map<string, RawUnit>> {
  const supabase = getServiceClient();

  const { data: assignments } = await supabase
    .from("building_cleaners")
    .select("building_id")
    .eq("staff_id", staffId);

  const buildingIds = (assignments ?? []).map((a) => a.building_id);
  if (buildingIds.length === 0) return new Map();

  const { data: units } = await supabase
    .from("units")
    .select(UNIT_SELECT)
    .in("building_id", buildingIds);

  return new Map((units ?? []).map((u) => [u.id, u as unknown as RawUnit]));
}

// A cleaner's jobs = every job at any building they're assigned to
// (building_cleaners), not individually-picked units.
export async function getJobsForStaff(staffId: string): Promise<PilotJob[]> {
  if (usesFakeData()) {
    return fakeGetJobsForStaff(staffId);
  }

  const unitById = await getUnitsForStaff(staffId);
  const unitIds = [...unitById.keys()];
  if (unitIds.length === 0) return [];

  const supabase = getServiceClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select(JOB_SELECT)
    .in("unit_id", unitIds)
    .is("cancelled_at", null)
    .is("completed_at", null)
    .order("checkout_date", { ascending: true });

  return (jobs ?? []).map((job) => toPilotJob(job as RawJob, unitById));
}

export async function getCompletedJobsForStaff(staffId: string): Promise<PilotJob[]> {
  if (usesFakeData()) {
    return fakeGetCompletedJobsForStaff(staffId);
  }

  const unitById = await getUnitsForStaff(staffId);
  const unitIds = [...unitById.keys()];
  if (unitIds.length === 0) return [];

  const supabase = getServiceClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select(JOB_SELECT)
    .in("unit_id", unitIds)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(25);

  return (jobs ?? []).map((job) => toPilotJob(job as RawJob, unitById));
}

export async function getJobById(jobId: string, staffId: string): Promise<PilotJob | null> {
  if (usesFakeData()) {
    return fakeGetJobById(jobId);
  }

  const unitById = await getUnitsForStaff(staffId);
  const supabase = getServiceClient();
  const { data: job } = await supabase
    .from("jobs")
    .select(JOB_SELECT)
    .eq("id", jobId)
    .maybeSingle();

  if (!job) return null;
  return toPilotJob(job as RawJob, unitById);
}

export { FAKE_TOKEN };
