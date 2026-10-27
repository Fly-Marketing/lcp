import "server-only";
import type { Grant, Session } from "@/lib/auth/types";

export const FAKE_BUILDING_A = "fake-building-a";
export const FAKE_BUILDING_B = "fake-building-b";
export const FAKE_STAFF_ID = "fake-staff-1";
export const FAKE_CUSTOMER_ID = "fake-customer-1";

const grant = (role: Grant["role"], buildingId: string, extra: Partial<Grant> = {}): Grant => ({
  role,
  buildingId,
  managementMode: "lcp",
  canEditPrice: false,
  isPrimary: false,
  ...extra,
});

// Fake-mode session, chosen by PILOT_FAKE_ROLE. Only reachable when PILOT_USE_FAKE_DATA !== "false".
export function fakeSession(): Session {
  const role = process.env.PILOT_FAKE_ROLE ?? "cleaner";
  const base = {
    accountId: "fake-account",
    displayName: "Eddy (fake)",
    staffId: null as string | null,
    customerId: null as string | null,
    isAdmin: false,
    deviceId: "fake-device",
  };
  switch (role) {
    case "owner":
      return { ...base, customerId: FAKE_CUSTOMER_ID, grants: [grant("owner", FAKE_BUILDING_A)] };
    case "manager":
      return {
        ...base,
        staffId: "fake-manager-staff",
        grants: [grant("manager", FAKE_BUILDING_A, { canEditPrice: true, isPrimary: true })],
      };
    case "multi":
      return {
        ...base,
        staffId: FAKE_STAFF_ID,
        customerId: FAKE_CUSTOMER_ID,
        grants: [
          grant("manager", FAKE_BUILDING_A, { canEditPrice: true, isPrimary: true }),
          grant("cleaner", FAKE_BUILDING_A),
          grant("owner", FAKE_BUILDING_B, { managementMode: "self" }),
        ],
      };
    case "admin":
      return {
        ...base,
        staffId: FAKE_STAFF_ID,
        isAdmin: true,
        grants: [
          grant("manager", FAKE_BUILDING_A, { canEditPrice: true }),
          grant("manager", FAKE_BUILDING_B, { canEditPrice: true }),
        ],
      };
    default:
      return { ...base, staffId: FAKE_STAFF_ID, grants: [grant("cleaner", FAKE_BUILDING_A)] };
  }
}
