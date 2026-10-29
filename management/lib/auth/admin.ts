import "server-only";
import { getServiceClient } from "@/lib/pilot/supabase";
import type { ChecklistItem } from "@/lib/pilot/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface AdminAccount {
  id: string;
  phone: string;
  name: string;
  staffId: string | null;
  customerId: string | null;
  staffName: string | null;
  customerName: string | null;
  isAdmin: boolean;
  active: boolean;
  devices: number;
  managerOf: { buildingId: string; buildingName: string; canEditPrice: boolean; isPrimary: boolean }[];
  cleansAt: { buildingId: string; buildingName: string; role: string }[];
}

export interface AdminData {
  accounts: AdminAccount[];
  staff: { id: string; name: string }[];
  customers: { id: string; name: string }[];
  buildings: { id: string; name: string; address: string | null; mode: "lcp" | "self"; customerId: string | null }[];
  units: {
    id: string;
    name: string;
    buildingId: string | null;
    buildingName: string;
    address: string | null;
    rate: number | null;
    expectedHours: number | null;
    checkoutTime: string | null;
    accessInstructions: string | null;
    importantNotes: string | null;
    specialRequirements: string | null;
    checklistItems: ChecklistItem[] | null;
  }[];
}

const one = <T>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export async function loadAdminData(): Promise<AdminData> {
  const db = getServiceClient();
  const [accounts, staff, customers, buildings, units, devices, managers, cleaners] = await Promise.all([
    db
      .from("accounts")
      .select("id, phone_e164, display_name, active, staff_id, customer_id, staff:staff_id(name, is_admin), customers:customer_id(name)")
      .order("created_at"),
    db.from("staff").select("id, name").order("name"),
    db.from("customers").select("id, name").order("name"),
    db.from("buildings").select("id, name, address, management_mode, customer_id").order("name"),
    db
      .from("units")
      .select("id, unit_name, address, standard_rate, expected_hours, checkout_time, access_instructions, important_notes, special_requirements, checklist_items, building_id, buildings(name)")
      .order("unit_name"),
    db
      .from("trusted_devices")
      .select("account_id")
      .is("revoked_at", null)
      .gt("hard_expires_at", new Date().toISOString()),
    db
      .from("role_assignments")
      .select("account_id, building_id, can_edit_price, is_primary, buildings(name)")
      .eq("role", "manager")
      .is("revoked_at", null),
    db
      .from("building_cleaners")
      .select("staff_id, building_id, role, buildings(name)")
      .is("revoked_at", null),
  ]);

  const deviceCount = new Map<string, number>();
  for (const d of devices.data ?? []) {
    deviceCount.set((d as any).account_id, (deviceCount.get((d as any).account_id) ?? 0) + 1);
  }

  return {
    accounts: (accounts.data ?? []).map((a: any) => ({
      id: a.id,
      phone: a.phone_e164,
      name: a.display_name ?? "",
      staffId: a.staff_id ?? null,
      customerId: a.customer_id ?? null,
      staffName: one<any>(a.staff)?.name ?? null,
      customerName: one<any>(a.customers)?.name ?? null,
      isAdmin: Boolean(one<any>(a.staff)?.is_admin),
      active: a.active,
      devices: deviceCount.get(a.id) ?? 0,
      managerOf: (managers.data ?? [])
        .filter((m: any) => m.account_id === a.id)
        .map((m: any) => ({
          buildingId: m.building_id,
          buildingName: one<any>(m.buildings)?.name ?? "",
          canEditPrice: Boolean(m.can_edit_price),
          isPrimary: Boolean(m.is_primary),
        })),
      cleansAt: a.staff_id
        ? (cleaners.data ?? [])
            .filter((c: any) => c.staff_id === a.staff_id)
            .map((c: any) => ({
              buildingId: c.building_id,
              buildingName: one<any>(c.buildings)?.name ?? "",
              role: c.role === "backup" ? "backup" : "primary",
            }))
        : [],
    })),
    staff: (staff.data ?? []).map((s: any) => ({ id: s.id, name: s.name ?? "(unnamed)" })),
    customers: (customers.data ?? []).map((c: any) => ({ id: c.id, name: c.name ?? "(unnamed)" })),
    buildings: (buildings.data ?? []).map((b: any) => ({
      id: b.id,
      name: b.name,
      address: b.address ?? null,
      mode: b.management_mode === "self" ? "self" : "lcp",
      customerId: b.customer_id,
    })),
    units: (units.data ?? []).map((u: any) => ({
      id: u.id,
      name: u.unit_name ?? "Unit",
      buildingId: u.building_id ?? null,
      buildingName: one<any>(u.buildings)?.name ?? "",
      address: u.address ?? null,
      rate: u.standard_rate === null ? null : Number(u.standard_rate),
      expectedHours: u.expected_hours === null ? null : Number(u.expected_hours),
      checkoutTime: u.checkout_time ? String(u.checkout_time).slice(0, 5) : null,
      accessInstructions: u.access_instructions ?? null,
      importantNotes: u.important_notes ?? null,
      specialRequirements: u.special_requirements ?? null,
      checklistItems: (u.checklist_items as ChecklistItem[] | null) ?? null,
    })),
  };
}
