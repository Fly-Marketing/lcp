import "server-only";

// Stand-in for the real access_links + jobs lookup (Supabase, service-role client).
// Hardcoded so the link/page/SMS interaction model can be proven out before any
// database writes are wired up. Swap getLinkedJob's body for a real Supabase query
// when ready — the return shape is what the real lookup should produce.

export interface PilotJob {
  id: string;
  unitLabel: string;
  propertyName: string;
  address: string;
  checkoutDate: string;
  checkoutTime: string;
  nextCheckInDate: string | null;
  expectedHours: number;
}

const FAKE_LINKS: Record<string, { staffName: string; job: PilotJob }> = {
  "demo-token-1": {
    staffName: "Eddy",
    job: {
      id: "e2b1be15-16e4-44f0-b399-65ff0573e234",
      unitLabel: "Suite 3B",
      propertyName: "Macewan B&B",
      address: "10608 106 St Edmonton, AB T5H 2X8",
      checkoutDate: "2026-10-09",
      checkoutTime: "11:00",
      nextCheckInDate: null,
      expectedHours: 2,
    },
  },
};

export function getLinkedJob(token: string): { staffName: string; job: PilotJob } | null {
  return FAKE_LINKS[token] ?? null;
}
