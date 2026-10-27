import "server-only";
import { getServiceClient } from "@/lib/pilot/supabase";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface AdminAccount {
  id: string;
  phone: string;
  name: string;
  staffName: string | null;
  customerName: string | null;
  active: boolean;
  devices: number;
}

export interface AdminData {
  accounts: AdminAccount[];
  staff: { id: string; name: string }[];
  customers: { id: string; name: string }[];
  buildings: { id: string; name: string; mode: "lcp" | "self"; customerId: string | null }[];
  units: { id: string; name: string; buildingName: string; rate: number | null }[];
}

const one = <T>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export async function loadAdminData(): Promise<AdminData> {
  const db = getServiceClient();
  const [accounts, staff, customers, buildings, units, devices] = await Promise.all([
    db
      .from("accounts")
      .select("id, phone_e164, display_name, active, staff:staff_id(name), customers:customer_id(name)")
      .order("created_at"),
    db.from("staff").select("id, name").order("name"),
    db.from("customers").select("id, name").order("name"),
    db.from("buildings").select("id, name, management_mode, customer_id").order("name"),
    db.from("units").select("id, unit_name, standard_rate, buildings(name)").order("unit_name"),
    db
      .from("trusted_devices")
      .select("account_id")
      .is("revoked_at", null)
      .gt("hard_expires_at", new Date().toISOString()),
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
      staffName: one<any>(a.staff)?.name ?? null,
      customerName: one<any>(a.customers)?.name ?? null,
      active: a.active,
      devices: deviceCount.get(a.id) ?? 0,
    })),
    staff: (staff.data ?? []).map((s: any) => ({ id: s.id, name: s.name ?? "(unnamed)" })),
    customers: (customers.data ?? []).map((c: any) => ({ id: c.id, name: c.name ?? "(unnamed)" })),
    buildings: (buildings.data ?? []).map((b: any) => ({
      id: b.id,
      name: b.name,
      mode: b.management_mode === "self" ? "self" : "lcp",
      customerId: b.customer_id,
    })),
    units: (units.data ?? []).map((u: any) => ({
      id: u.id,
      name: u.unit_name ?? "Unit",
      buildingName: one<any>(u.buildings)?.name ?? "",
      rate: u.standard_rate === null ? null : Number(u.standard_rate),
    })),
  };
}
