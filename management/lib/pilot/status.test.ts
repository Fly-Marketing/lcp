import { describe, expect, it } from "vitest";
import { ownerStatus, unitStatus, firstName } from "@/lib/pilot/status";

const job = (over: Record<string, unknown>) => ({
  status: "Upcoming",
  cancelledAt: null,
  completedAt: null,
  checkoutDate: "2026-10-01",
  ...over,
});

describe("ownerStatus", () => {
  it("maps raw statuses to owner copy", () => {
    expect(ownerStatus(job({ status: "Open" }))).toBe("Scheduled");
    expect(ownerStatus(job({ status: "Ready" }))).toBe("Scheduled");
    expect(ownerStatus(job({ status: "Claimed" }))).toBe("Accepted");
    expect(ownerStatus(job({ status: "Completed", completedAt: "x" }))).toBe("Clean");
    expect(ownerStatus(job({ status: "Needs attention", completedAt: "x" }))).toBe("Flagged");
    expect(ownerStatus(job({ status: "Not clean", completedAt: "x" }))).toBe("Flagged");
    expect(ownerStatus(job({ status: "Cancelled", cancelledAt: "x" }))).toBe("Cancelled");
  });
});

describe("unitStatus", () => {
  it("Ready when nothing pending and no reports", () => {
    expect(unitStatus({ jobs: [job({ status: "Completed", completedAt: "x" })], openReports: 0 })).toBe("Ready");
    expect(unitStatus({ jobs: [], openReports: 0 })).toBe("Ready");
  });
  it("Needs clean when a job is pending", () => {
    expect(unitStatus({ jobs: [job({ status: "Upcoming" })], openReports: 0 })).toBe("Needs clean");
    expect(unitStatus({ jobs: [job({ status: "Claimed" })], openReports: 0 })).toBe("Needs clean");
  });
  it("cancelled pending jobs do not count", () => {
    expect(unitStatus({ jobs: [job({ status: "Upcoming", cancelledAt: "x" })], openReports: 0 })).toBe("Ready");
  });
  it("Flagged on open reports", () => {
    expect(unitStatus({ jobs: [job({ status: "Upcoming" })], openReports: 1 })).toBe("Flagged");
  });
  it("Flagged when the latest finished clean was flagged, but not an older one", () => {
    const old = job({ status: "Needs attention", completedAt: "x", checkoutDate: "2026-09-01" });
    const recent = job({ status: "Completed", completedAt: "x", checkoutDate: "2026-10-01" });
    expect(unitStatus({ jobs: [old, recent], openReports: 0 })).toBe("Ready");
    expect(unitStatus({ jobs: [recent, { ...old, checkoutDate: "2026-10-05" }], openReports: 0 })).toBe("Flagged");
  });
});

describe("firstName", () => {
  it("returns the first token", () => {
    expect(firstName("Lydia Smith")).toBe("Lydia");
    expect(firstName("  ")).toBeNull();
    expect(firstName(null)).toBeNull();
  });
});
