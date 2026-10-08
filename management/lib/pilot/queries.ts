import "server-only";
import { getServiceClient } from "@/lib/pilot/supabase";
import type { PilotJob } from "@/lib/pilot/types";

export async function getStaffForToken(tokenHash: string) {
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

// A cleaner's jobs = every open job at any building they're assigned to
// (building_cleaners), not individually-picked units.
export async function getJobsForStaff(staffId: string): Promise<PilotJob[]> {
  const supabase = getServiceClient();

  const { data: assignments } = await supabase
    .from("building_cleaners")
    .select("building_id")
    .eq("staff_id", staffId);

  const buildingIds = (assignments ?? []).map((a) => a.building_id);
  if (buildingIds.length === 0) return [];

  const { data: units } = await supabase
    .from("units")
    .select("id, unit_name, address, building_id, buildings(name)")
    .in("building_id", buildingIds);

  const unitIds = (units ?? []).map((u) => u.id);
  if (unitIds.length === 0) return [];

  const unitById = new Map((units ?? []).map((u) => [u.id, u]));

  const { data: jobs } = await supabase
    .from("jobs")
    .select(
      "id, unit_id, checkout_date, checkout_time, next_check_in_date, expected_hours, status, completed_at, cancelled_at"
    )
    .in("unit_id", unitIds)
    .is("cancelled_at", null)
    .is("completed_at", null)
    .order("checkout_date", { ascending: true });

  return (jobs ?? []).map((job) => {
    const unit = job.unit_id ? unitById.get(job.unit_id) : undefined;
    const building = unit?.buildings as { name: string } | { name: string }[] | null;
    const buildingName = Array.isArray(building) ? building[0]?.name : building?.name;

    return {
      id: job.id,
      unitLabel: unit?.unit_name ?? "Unknown unit",
      propertyName: buildingName ?? "Unknown property",
      address: unit?.address ?? "",
      checkoutDate: job.checkout_date,
      checkoutTime: job.checkout_time,
      nextCheckInDate: job.next_check_in_date,
      expectedHours: Number(job.expected_hours ?? 0),
      status: job.status,
    };
  });
}
