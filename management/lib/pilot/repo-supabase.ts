import "server-only";
import { getServiceClient } from "@/lib/pilot/supabase";
import type {
  BuildingRow,
  CleanerRow,
  CreateJobResult,
  JobQuery,
  JobRow,
  ManagerRow,
  NewReport,
  PilotRepo,
  PriceHistoryRow,
  ReportRow,
  UnitPatch,
  UnitRow,
} from "@/lib/pilot/repo";
import type { ChecklistItem } from "@/lib/pilot/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const JOB_SELECT =
  "id, unit_id, checkout_date, checkout_time, next_check_in_date, latest_clean_date, expected_hours, status, claimed_at, completed_at, cancelled_at, assigned_staff_id, special_request, price, source, created_at, units!inner(building_id), staff:assigned_staff_id(name)";

const REPORT_SELECT =
  "id, job_id, staff_id, category, description, urgent, photo_urls, status, created_at, resolved_at, jobs!inner(unit_id, units!inner(building_id))";

const UNIT_SELECT =
  "id, building_id, unit_name, address, access_instructions, important_notes, special_requirements, checklist_items, standard_rate, expected_hours, checkout_time, active";

const ACCEPTABLE = ["Open", "Upcoming", "Ready"];

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const one = <T>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

function mapJob(r: any): JobRow {
  return {
    id: r.id,
    unitId: r.unit_id,
    buildingId: one<any>(r.units)?.building_id ?? null,
    checkoutDate: r.checkout_date,
    checkoutTime: r.checkout_time,
    nextCheckInDate: r.next_check_in_date,
    latestCleanDate: r.latest_clean_date,
    expectedHours: num(r.expected_hours),
    status: r.status,
    claimedAt: r.claimed_at,
    completedAt: r.completed_at,
    cancelledAt: r.cancelled_at,
    assignedStaffId: r.assigned_staff_id,
    assignedStaffName: one<any>(r.staff)?.name ?? null,
    specialRequest: r.special_request,
    price: num(r.price),
    source: r.source,
    createdAt: r.created_at,
  };
}

function mapReport(r: any): ReportRow {
  const job = one<any>(r.jobs);
  return {
    id: r.id,
    jobId: r.job_id,
    unitId: job?.unit_id ?? null,
    buildingId: one<any>(job?.units)?.building_id ?? null,
    staffId: r.staff_id,
    category: r.category,
    description: r.description,
    urgent: r.urgent,
    photoPaths: r.photo_urls ?? [],
    status: r.status,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at,
  };
}

function mapUnit(r: any): UnitRow {
  return {
    id: r.id,
    buildingId: r.building_id,
    name: r.unit_name ?? "Unknown unit",
    address: r.address,
    accessInstructions: r.access_instructions,
    importantNotes: r.important_notes,
    specialRequirements: r.special_requirements,
    checklistItems: (r.checklist_items as ChecklistItem[] | null) ?? null,
    standardRate: num(r.standard_rate),
    expectedHours: num(r.expected_hours),
    checkoutTime: r.checkout_time,
    active: r.active,
  };
}

function legacyPath(value: string): string | null {
  if (!value.startsWith("http")) return value;
  const m = value.match(/\/object\/(?:public|sign|authenticated)\/report-photos\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function createSupabaseRepo(): PilotRepo {
  const db = () => getServiceClient();

  return {
    async listBuildings(ids) {
      if (ids.length === 0) return [];
      const { data, error } = await db()
        .from("buildings")
        .select("id, name, address, management_mode, customer_id, customers(name, mobile)")
        .in("id", ids);
      if (error) throw new Error(error.message);
      return (data ?? []).map((b: any): BuildingRow => {
        const c = one<any>(b.customers);
        return {
          id: b.id,
          name: b.name,
          address: b.address,
          managementMode: b.management_mode === "self" ? "self" : "lcp",
          customerId: b.customer_id,
          customerName: c?.name ?? null,
          customerMobile: c?.mobile ?? null,
        };
      });
    },

    async listUnits(buildingIds) {
      if (buildingIds.length === 0) return [];
      const { data, error } = await db().from("units").select(UNIT_SELECT).in("building_id", buildingIds).order("unit_name");
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapUnit);
    },

    async getUnit(id) {
      const { data } = await db().from("units").select(UNIT_SELECT).eq("id", id).maybeSingle();
      return data ? mapUnit(data) : null;
    },

    async updateUnit(id, patch: UnitPatch) {
      const row: Record<string, unknown> = {};
      if ("accessInstructions" in patch) row.access_instructions = patch.accessInstructions ?? null;
      if ("importantNotes" in patch) row.important_notes = patch.importantNotes ?? null;
      if ("specialRequirements" in patch) row.special_requirements = patch.specialRequirements ?? null;
      if ("checklistItems" in patch) row.checklist_items = patch.checklistItems ?? null;
      if (Object.keys(row).length === 0) return;
      const { error } = await db().from("units").update(row).eq("id", id);
      if (error) throw new Error(error.message);
    },

    async listJobs(q: JobQuery) {
      if (q.buildingIds.length === 0) return [];
      let query = db().from("jobs").select(JOB_SELECT).in("units.building_id", q.buildingIds);
      if (!q.includeCancelled) query = query.is("cancelled_at", null);
      if (q.statuses) query = query.in("status", q.statuses);
      if (q.assignedStaffId) query = query.eq("assigned_staff_id", q.assignedStaffId);
      if (q.unassignedOnly) query = query.is("assigned_staff_id", null);
      if (q.onlyOpen) query = query.is("completed_at", null).is("cancelled_at", null);
      if (q.onlyCompleted) query = query.not("completed_at", "is", null);
      if (q.claimedOrCompleted) query = query.or("claimed_at.not.is.null,completed_at.not.is.null");
      if (q.checkoutFrom) query = query.gte("checkout_date", q.checkoutFrom);
      if (q.orderBy === "checkout_asc") query = query.order("checkout_date", { ascending: true });
      if (q.orderBy === "checkout_desc") query = query.order("checkout_date", { ascending: false });
      if (q.orderBy === "completed_desc") query = query.order("completed_at", { ascending: false });
      if (q.limit) query = query.limit(q.limit);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapJob);
    },

    async getJob(id) {
      const { data } = await db().from("jobs").select(JOB_SELECT).eq("id", id).maybeSingle();
      return data ? mapJob(data) : null;
    },

    async claimJob(jobId, staffId) {
      const { data } = await db()
        .from("jobs")
        .update({ status: "Claimed", claimed_at: new Date().toISOString(), assigned_staff_id: staffId })
        .eq("id", jobId)
        .is("assigned_staff_id", null)
        .is("cancelled_at", null)
        .in("status", ACCEPTABLE)
        .select("id");
      return (data?.length ?? 0) === 1;
    },

    async completeJob(jobId, staffId) {
      const { data } = await db()
        .from("jobs")
        .update({ status: "Completed", completed_at: new Date().toISOString() })
        .eq("id", jobId)
        .eq("assigned_staff_id", staffId)
        .is("completed_at", null)
        .is("cancelled_at", null)
        .select("id");
      return (data?.length ?? 0) === 1;
    },

    async setJobResult(jobId, state) {
      const { data } = await db()
        .from("jobs")
        .update({ status: state })
        .eq("id", jobId)
        .not("completed_at", "is", null)
        .select("id");
      return (data?.length ?? 0) === 1;
    },

    async createOwnerJob(input): Promise<CreateJobResult> {
      const { data, error } = await db().rpc("create_owner_job", {
        p_unit_id: input.unitId,
        p_date: input.date,
        p_time: input.time,
        p_special_request: input.specialRequest,
        p_account_id: input.accountId,
        p_idempotency_key: input.idempotencyKey,
      });
      if (error) throw new Error(error.message);
      const r = data as { job_id: string; status: CreateJobResult["status"] };
      return { jobId: r.job_id, status: r.status };
    },

    async updateJobPrice(jobId, price, accountId, reason) {
      const { error } = await db().rpc("update_job_price", {
        p_job_id: jobId,
        p_new_price: price,
        p_account_id: accountId,
        p_reason: reason,
      });
      if (error) throw new Error(error.message);
    },

    async listPriceHistory(jobId): Promise<PriceHistoryRow[]> {
      const { data } = await db()
        .from("job_price_history")
        .select("old_price, new_price, reason, changed_at, accounts:changed_by_account_id(display_name)")
        .eq("job_id", jobId)
        .order("changed_at", { ascending: false });
      return (data ?? []).map((r: any) => ({
        oldPrice: num(r.old_price),
        newPrice: Number(r.new_price),
        reason: r.reason,
        changedAt: r.changed_at,
        changedByName: one<any>(r.accounts)?.display_name ?? null,
      }));
    },

    async listReportsForJobs(jobIds) {
      if (jobIds.length === 0) return [];
      const { data, error } = await db()
        .from("reports")
        .select(REPORT_SELECT)
        .in("job_id", jobIds)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapReport);
    },

    async listReportsForBuildings(buildingIds, openOnly) {
      if (buildingIds.length === 0) return [];
      let q = db().from("reports").select(REPORT_SELECT).in("jobs.units.building_id", buildingIds);
      if (openOnly) q = q.is("resolved_at", null);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapReport);
    },

    async getReport(id) {
      const { data } = await db().from("reports").select(REPORT_SELECT).eq("id", id).maybeSingle();
      return data ? mapReport(data) : null;
    },

    async insertReport(r: NewReport) {
      const { error } = await db().from("reports").insert({
        job_id: r.jobId,
        staff_id: r.staffId,
        category: r.category,
        description: r.description,
        urgent: r.urgent,
        photo_urls: r.photoPaths.length > 0 ? r.photoPaths : null,
      });
      if (error) throw new Error(error.message);
    },

    async updateReport(id, patch) {
      const { error } = await db()
        .from("reports")
        .update({
          description: patch.description,
          category: patch.category,
          urgent: patch.urgent,
          photo_urls: patch.photoPaths.length > 0 ? patch.photoPaths : null,
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },

    async deleteReport(id) {
      const { error } = await db().from("reports").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },

    async resolveReport(id) {
      const { error } = await db()
        .from("reports")
        .update({ resolved_at: new Date().toISOString(), status: "Resolved" })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },

    async uploadPhoto(jobId, file) {
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
      const path = `${jobId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await db().storage.from("report-photos").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw new Error(error.message);
      return { path };
    },

    async signedPhotoUrl(value) {
      const path = legacyPath(value);
      if (!path) return null;
      const { data } = await db().storage.from("report-photos").createSignedUrl(path, 60 * 60);
      return data?.signedUrl ?? null;
    },

    async listCleaners(buildingIds): Promise<CleanerRow[]> {
      if (buildingIds.length === 0) return [];
      const { data, error } = await db()
        .from("building_cleaners")
        .select("building_id, staff_id, role, staff(name, mobile)")
        .in("building_id", buildingIds)
        .is("revoked_at", null);
      if (error) throw new Error(error.message);
      const staffIds = [...new Set((data ?? []).map((r: any) => r.staff_id))];
      const accounts = new Map<string, string>();
      if (staffIds.length > 0) {
        const { data: accs } = await db().from("accounts").select("id, staff_id").in("staff_id", staffIds);
        for (const a of accs ?? []) accounts.set((a as any).staff_id, (a as any).id);
      }
      return (data ?? []).map((r: any) => {
        const s = one<any>(r.staff);
        return {
          buildingId: r.building_id,
          staffId: r.staff_id,
          accountId: accounts.get(r.staff_id) ?? null,
          name: s?.name ?? "Cleaner",
          mobile: s?.mobile ?? null,
          role: r.role === "backup" ? "backup" : "primary",
        };
      });
    },

    async listManagers(buildingIds): Promise<ManagerRow[]> {
      if (buildingIds.length === 0) return [];
      const { data, error } = await db()
        .from("role_assignments")
        .select("building_id, account_id, can_edit_price, is_primary, accounts(display_name, phone_e164)")
        .in("building_id", buildingIds)
        .eq("role", "manager")
        .is("revoked_at", null);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r: any) => {
        const a = one<any>(r.accounts);
        return {
          buildingId: r.building_id,
          accountId: r.account_id,
          name: a?.display_name ?? "Manager",
          phone: a?.phone_e164 ?? "",
          canEditPrice: r.can_edit_price,
          isPrimary: r.is_primary,
        };
      });
    },

    async ensurePerson({ name, phoneE164, asCleaner }) {
      const supabase = db();
      const { data: existing } = await supabase
        .from("accounts")
        .select("id, staff_id, display_name")
        .eq("phone_e164", phoneE164)
        .maybeSingle();

      let staffId: string | null = (existing as any)?.staff_id ?? null;
      if (asCleaner && !staffId) {
        const { data: staff, error } = await supabase
          .from("staff")
          .insert({ name, mobile: phoneE164.slice(-10), active: true })
          .select("id")
          .single();
        if (error || !staff) throw new Error(error?.message ?? "Could not create staff");
        staffId = staff.id as string;
      }

      if (existing) {
        if (staffId && !(existing as any).staff_id) {
          await supabase.from("accounts").update({ staff_id: staffId }).eq("id", (existing as any).id);
        }
        return { accountId: (existing as any).id as string, staffId };
      }

      const { data: acc, error } = await supabase
        .from("accounts")
        .insert({ phone_e164: phoneE164, display_name: name, staff_id: staffId })
        .select("id")
        .single();
      if (error || !acc) throw new Error(error?.message ?? "Could not create account");
      return { accountId: acc.id as string, staffId };
    },

    async addCleaner(buildingId, staffId, role) {
      const supabase = db();
      const { data: existing } = await supabase
        .from("building_cleaners")
        .select("id")
        .eq("building_id", buildingId)
        .eq("staff_id", staffId)
        .maybeSingle();
      if (existing) {
        await supabase.from("building_cleaners").update({ revoked_at: null, role }).eq("id", (existing as any).id);
        return;
      }
      const { error } = await supabase
        .from("building_cleaners")
        .insert({ building_id: buildingId, staff_id: staffId, role });
      if (error) throw new Error(error.message);
    },

    async removeCleaner(buildingId, staffId) {
      await db()
        .from("building_cleaners")
        .update({ revoked_at: new Date().toISOString() })
        .eq("building_id", buildingId)
        .eq("staff_id", staffId)
        .is("revoked_at", null);
    },

    async setManager(buildingId, accountId, opts) {
      const supabase = db();
      if (opts.isPrimary) {
        await supabase
          .from("role_assignments")
          .update({ is_primary: false })
          .eq("building_id", buildingId)
          .eq("is_primary", true)
          .neq("account_id", accountId);
      }
      const { data: existing } = await supabase
        .from("role_assignments")
        .select("id")
        .eq("account_id", accountId)
        .eq("role", "manager")
        .eq("building_id", buildingId)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("role_assignments")
          .update({ revoked_at: null, can_edit_price: opts.canEditPrice, is_primary: opts.isPrimary })
          .eq("id", (existing as any).id);
        if (error) throw new Error(error.message);
        return;
      }
      const { error } = await supabase.from("role_assignments").insert({
        account_id: accountId,
        role: "manager",
        building_id: buildingId,
        can_edit_price: opts.canEditPrice,
        is_primary: opts.isPrimary,
      });
      if (error) throw new Error(error.message);
    },

    async removeManager(buildingId, accountId) {
      await db()
        .from("role_assignments")
        .update({ revoked_at: new Date().toISOString(), is_primary: false })
        .eq("account_id", accountId)
        .eq("role", "manager")
        .eq("building_id", buildingId)
        .is("revoked_at", null);
    },
  };
}
