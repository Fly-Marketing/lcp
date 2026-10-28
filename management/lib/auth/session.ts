import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServiceClient } from "@/lib/pilot/supabase";
import { usesFakeData } from "@/lib/pilot/mode";
import { deviceCookieName } from "@/lib/auth/config";
import { getAccount } from "@/lib/auth/accounts";
import { resolveDevice } from "@/lib/auth/devices";
import { fakeSession } from "@/lib/auth/fake-session";
import type { Grant, ManagementMode, Session } from "@/lib/auth/types";

type BuildingRow = { id: string; management_mode: ManagementMode | null };

async function loadGrants(account: {
  id: string;
  staff_id: string | null;
  customer_id: string | null;
}): Promise<{ grants: Grant[]; isAdmin: boolean }> {
  const supabase = getServiceClient();
  const grants: Grant[] = [];
  const modes = new Map<string, ManagementMode>();

  const rememberModes = (rows: BuildingRow[] | null) => {
    for (const b of rows ?? []) modes.set(b.id, b.management_mode === "self" ? "self" : "lcp");
  };

  // Owner, cleaner, staff flags and manager lookups are independent, so they run in one round trip.
  const [ownerRes, assignmentsRes, staffRes, managerRes] = await Promise.all([
    account.customer_id
      ? supabase.from("buildings").select("id, management_mode").eq("customer_id", account.customer_id)
      : null,
    account.staff_id
      ? supabase
          .from("building_cleaners")
          .select("building_id, buildings(id, management_mode)")
          .eq("staff_id", account.staff_id)
          .is("revoked_at", null)
      : null,
    account.staff_id
      ? supabase.from("staff").select("is_admin, active").eq("id", account.staff_id).maybeSingle()
      : null,
    supabase
      .from("role_assignments")
      .select("building_id, can_edit_price, is_primary, buildings(id, management_mode)")
      .eq("account_id", account.id)
      .eq("role", "manager")
      .is("revoked_at", null),
  ]);

  // Owner: derived from buildings.customer_id.
  const ownerBuildings = (ownerRes?.data as BuildingRow[] | null) ?? [];
  rememberModes(ownerBuildings);
  for (const b of ownerBuildings) {
    grants.push({
      role: "owner",
      buildingId: b.id,
      managementMode: modes.get(b.id) ?? "lcp",
      canEditPrice: false,
      isPrimary: false,
    });
  }

  // Cleaner: derived from building_cleaners (soft-removed rows excluded).
  const isAdmin = Boolean(staffRes?.data?.is_admin) && staffRes?.data?.active !== false;
  for (const a of assignmentsRes?.data ?? []) {
    const b = Array.isArray(a.buildings) ? a.buildings[0] : a.buildings;
    const mode: ManagementMode = b?.management_mode === "self" ? "self" : "lcp";
    grants.push({
      role: "cleaner",
      buildingId: a.building_id as string,
      managementMode: mode,
      canEditPrice: false,
      isPrimary: false,
    });
  }

  // Manager: role_assignments.
  for (const r of managerRes.data ?? []) {
    const b = Array.isArray(r.buildings) ? r.buildings[0] : r.buildings;
    grants.push({
      role: "manager",
      buildingId: r.building_id as string,
      managementMode: b?.management_mode === "self" ? "self" : "lcp",
      canEditPrice: Boolean(r.can_edit_price),
      isPrimary: Boolean(r.is_primary),
    });
  }

  // Admins operate every building as an LCP manager (price editing included).
  if (isAdmin) {
    const { data: all } = await supabase.from("buildings").select("id, management_mode");
    for (const b of (all as BuildingRow[] | null) ?? []) {
      if (!grants.some((g) => g.role === "manager" && g.buildingId === b.id)) {
        grants.push({
          role: "manager",
          buildingId: b.id,
          managementMode: b.management_mode === "self" ? "self" : "lcp",
          canEditPrice: true,
          isPrimary: false,
        });
      }
    }
  }

  return { grants, isAdmin };
}

// Resolves the trusted-device cookie to a Session, or null. Cached per request.
export const getSession = cache(async (): Promise<Session | null> => {
  if (usesFakeData()) return fakeSession();

  const store = await cookies();
  const raw = store.get(deviceCookieName())?.value;
  if (!raw) return null;

  const device = await resolveDevice(raw);
  if (!device) return null;
  const account = await getAccount(device.account_id);
  if (!account) return null;

  const { grants, isAdmin } = await loadGrants(account);
  return {
    accountId: account.id,
    displayName: account.display_name ?? "there",
    staffId: account.staff_id,
    customerId: account.customer_id,
    isAdmin,
    grants,
    deviceId: device.id,
  };
});

// Use at the top of every protected page / action. `returnTo` is where to land after sign-in.
export async function requireSession(returnTo?: string): Promise<Session> {
  const session = await getSession();
  if (!session) {
    const qs = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
    redirect(`/pilot/signin${qs}`);
  }
  return session;
}

export async function setDeviceCookie(token: string, hardExpiresAt: Date) {
  const store = await cookies();
  store.set(deviceCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(60, Math.floor((hardExpiresAt.getTime() - Date.now()) / 1000)),
  });
}

export async function clearDeviceCookie() {
  const store = await cookies();
  store.delete(deviceCookieName());
}

export async function requestMeta(): Promise<{ ip: string; userAgent: string | null }> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return { ip, userAgent: h.get("user-agent") };
}
