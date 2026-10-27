import { describe, expect, it } from "vitest";
import { normalizePhone } from "@/lib/auth/phone";
import { safeReturnTo } from "@/lib/auth/return-to";
import { generateCode, safeEqual, sha256 } from "@/lib/auth/crypto";
import { navFor, homeFor } from "@/lib/auth/nav";
import { can, buildingIdsFor } from "@/lib/auth/permissions";
import type { Grant, Session } from "@/lib/auth/types";

describe("normalizePhone", () => {
  it.each(["780-850-0235", "(780) 850 0235", "+17808500235", "17808500235", "780.850.0235"])(
    "normalizes %s",
    (input) => expect(normalizePhone(input)).toBe("+17808500235")
  );
  it.each(["", "abc", "12345", "080-850-0235", "780-050-0235", "+447911123456", null, undefined])(
    "rejects %s",
    (input) => expect(normalizePhone(input as string)).toBeNull()
  );
});

describe("safeReturnTo", () => {
  it("accepts pilot paths", () => {
    expect(safeReturnTo("/pilot/j/abc")).toBe("/pilot/j/abc");
    expect(safeReturnTo("/pilot/jobs/123?x=1")).toBe("/pilot/jobs/123?x=1");
  });
  it.each(["//evil.com", "https://x.com", "/\\evil", "/other", "", "/pilot/../x://y", "/pilot/a\nb", null])(
    "rejects %s",
    (raw) => expect(safeReturnTo(raw as string)).toBe("/pilot/start")
  );
});

describe("crypto", () => {
  it("generates six-digit codes including leading zeros", () => {
    for (let i = 0; i < 500; i++) expect(generateCode()).toMatch(/^\d{6}$/);
  });
  it("safeEqual compares correctly", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(sha256("x")).toHaveLength(64);
  });
});

const A = "building-a";
const B = "building-b";
const grant = (role: Grant["role"], buildingId: string, extra: Partial<Grant> = {}): Grant => ({
  role,
  buildingId,
  managementMode: "lcp",
  canEditPrice: false,
  isPrimary: false,
  ...extra,
});
const session = (grants: Grant[], extra: Partial<Session> = {}): Session => ({
  accountId: "acc",
  displayName: "Test",
  staffId: "staff-1",
  customerId: null,
  isAdmin: false,
  grants,
  deviceId: null,
  ...extra,
});

const openJob = { assignedStaffId: null, status: "Open", cancelled: false };
const myJob = { assignedStaffId: "staff-1", status: "Claimed", cancelled: false };
const otherJob = { assignedStaffId: "staff-2", status: "Claimed", cancelled: false };

describe("permissions", () => {
  it("denies everything without a session", () => {
    expect(can(null, "job.view", { buildingId: A })).toBe(false);
  });

  it("job.view is building scoped; cleaners only see their own or acceptable unclaimed jobs", () => {
    const cleaner = session([grant("cleaner", A)]);
    expect(can(cleaner, "job.view", { buildingId: A, job: openJob })).toBe(true);
    expect(can(cleaner, "job.view", { buildingId: A, job: myJob })).toBe(true);
    // another cleaner's claimed job at the same building is hidden
    expect(can(cleaner, "job.view", { buildingId: A, job: otherJob })).toBe(false);
    // cancelled unclaimed job is not an opportunity
    expect(can(cleaner, "job.view", { buildingId: A, job: { ...openJob, cancelled: true } })).toBe(false);
    // other building
    expect(can(cleaner, "job.view", { buildingId: B, job: openJob })).toBe(false);
    // no job context -> deny for cleaners
    expect(can(cleaner, "job.view", { buildingId: A })).toBe(false);
    expect(can(session([]), "job.view", { buildingId: A, job: openJob })).toBe(false);
    // owners and managers see everything in their buildings, nothing elsewhere
    expect(can(session([grant("owner", A)]), "job.view", { buildingId: A, job: otherJob })).toBe(true);
    expect(can(session([grant("owner", A)]), "job.view", { buildingId: B, job: otherJob })).toBe(false);
    expect(can(session([grant("manager", A)]), "job.view", { buildingId: A, job: otherJob })).toBe(true);
    expect(can(session([], { isAdmin: true }), "job.view", { buildingId: B })).toBe(true);
  });

  it("job.accept needs a cleaner grant, an unclaimed acceptable job, same building", () => {
    const cleaner = session([grant("cleaner", A)]);
    expect(can(cleaner, "job.accept", { buildingId: A, job: openJob })).toBe(true);
    expect(can(cleaner, "job.accept", { buildingId: B, job: openJob })).toBe(false);
    expect(can(cleaner, "job.accept", { buildingId: A, job: { ...openJob, assignedStaffId: "staff-2" } })).toBe(false);
    expect(can(cleaner, "job.accept", { buildingId: A, job: { ...openJob, cancelled: true } })).toBe(false);
    expect(can(cleaner, "job.accept", { buildingId: A, job: { ...openJob, status: "Completed" } })).toBe(false);
    // a manager or owner (without cleaner grant) cannot accept
    expect(can(session([grant("manager", A)]), "job.accept", { buildingId: A, job: openJob })).toBe(false);
    expect(can(session([grant("owner", A)]), "job.accept", { buildingId: A, job: openJob })).toBe(false);
  });

  it("job.complete only for the assigned cleaner", () => {
    const cleaner = session([grant("cleaner", A)]);
    expect(can(cleaner, "job.complete", { buildingId: A, job: myJob })).toBe(true);
    expect(can(cleaner, "job.complete", { buildingId: A, job: otherJob })).toBe(false);
    expect(can(cleaner, "job.complete", { buildingId: A, job: openJob })).toBe(false);
    expect(can(session([grant("manager", A)], { staffId: "staff-9" }), "job.complete", { buildingId: A, job: myJob })).toBe(false);
  });

  it("job.updateResult: assigned cleaner, manager on building, admin", () => {
    expect(can(session([grant("cleaner", A)]), "job.updateResult", { buildingId: A, job: myJob })).toBe(true);
    expect(can(session([grant("cleaner", A)]), "job.updateResult", { buildingId: A, job: otherJob })).toBe(false);
    expect(can(session([grant("manager", A)], { staffId: "x" }), "job.updateResult", { buildingId: A, job: otherJob })).toBe(true);
    expect(can(session([grant("manager", B)], { staffId: "x" }), "job.updateResult", { buildingId: A, job: otherJob })).toBe(false);
    expect(can(session([grant("owner", A)], { staffId: "x" }), "job.updateResult", { buildingId: A, job: otherJob })).toBe(false);
    expect(can(session([], { isAdmin: true, staffId: "x" }), "job.updateResult", { buildingId: A, job: otherJob })).toBe(true);
  });

  it("reports: create/photo by assigned cleaner or manager; edit/delete by author or manager", () => {
    const cleaner = session([grant("cleaner", A)]);
    expect(can(cleaner, "report.create", { buildingId: A, job: myJob })).toBe(true);
    expect(can(cleaner, "report.create", { buildingId: A, job: otherJob })).toBe(false);
    expect(can(cleaner, "photo.upload", { buildingId: A, job: otherJob })).toBe(false);
    expect(can(cleaner, "report.edit", { buildingId: A, report: { staffId: "staff-1" } })).toBe(true);
    expect(can(cleaner, "report.edit", { buildingId: A, report: { staffId: "staff-2" } })).toBe(false);
    expect(can(cleaner, "report.delete", { buildingId: A, report: { staffId: "staff-2" } })).toBe(false);
    const mgr = session([grant("manager", A)], { staffId: "other" });
    expect(can(mgr, "report.delete", { buildingId: A, report: { staffId: "staff-2" } })).toBe(true);
    expect(can(mgr, "report.delete", { buildingId: B, report: { staffId: "staff-2" } })).toBe(false);
    const owner = session([grant("owner", A)], { staffId: null });
    expect(can(owner, "report.edit", { buildingId: A, report: { staffId: "staff-2" } })).toBe(false);
    expect(can(owner, "report.view", { buildingId: A, job: myJob })).toBe(true);
  });

  it("job.create / unit.edit: owner or manager of the building", () => {
    expect(can(session([grant("owner", A)]), "job.create", { buildingId: A })).toBe(true);
    expect(can(session([grant("owner", A)]), "job.create", { buildingId: B })).toBe(false);
    expect(can(session([grant("manager", A)]), "unit.edit", { buildingId: A })).toBe(true);
    expect(can(session([grant("cleaner", A)]), "job.create", { buildingId: A })).toBe(false);
    expect(can(session([grant("cleaner", A)]), "unit.edit", { buildingId: A })).toBe(false);
  });

  it("team.edit / manager.assign: only owners of self-managed buildings, or admin", () => {
    const lcpOwner = session([grant("owner", A, { managementMode: "lcp" })]);
    const selfOwner = session([grant("owner", A, { managementMode: "self" })]);
    expect(can(lcpOwner, "team.edit", { buildingId: A })).toBe(false);
    expect(can(lcpOwner, "manager.assign", { buildingId: A })).toBe(false);
    expect(can(lcpOwner, "team.view", { buildingId: A })).toBe(true);
    expect(can(selfOwner, "team.edit", { buildingId: A })).toBe(true);
    expect(can(selfOwner, "manager.assign", { buildingId: A })).toBe(true);
    expect(can(selfOwner, "team.edit", { buildingId: B })).toBe(false);
    expect(can(session([grant("manager", A, { managementMode: "self" })]), "team.edit", { buildingId: A })).toBe(false);
    expect(can(session([], { isAdmin: true }), "team.edit", { buildingId: A })).toBe(true);
  });

  it("price.edit needs a manager grant with canEditPrice (ownership never grants it)", () => {
    expect(can(session([grant("owner", A, { managementMode: "self" })]), "price.edit", { buildingId: A })).toBe(false);
    expect(can(session([grant("manager", A)]), "price.edit", { buildingId: A })).toBe(false);
    expect(can(session([grant("manager", A, { canEditPrice: true })]), "price.edit", { buildingId: A })).toBe(true);
    expect(can(session([grant("manager", A, { canEditPrice: true })]), "price.edit", { buildingId: B })).toBe(false);
    // owner + manager(canEditPrice) combine
    expect(
      can(session([grant("owner", A), grant("manager", A, { canEditPrice: true })]), "price.edit", { buildingId: A })
    ).toBe(true);
    expect(can(session([], { isAdmin: true }), "price.edit", { buildingId: A })).toBe(true);
  });

  it("buildingIdsFor filters by role", () => {
    const s = session([grant("cleaner", A), grant("manager", B)]);
    expect(buildingIdsFor(s).sort()).toEqual([A, B]);
    expect(buildingIdsFor(s, ["manager"])).toEqual([B]);
    expect(buildingIdsFor(s, ["owner"])).toEqual([]);
  });
});

describe("navigation", () => {
  it("cleaner only", () => {
    expect(navFor(session([grant("cleaner", A)])).map((i) => i.label)).toEqual(["Today", "My Jobs", "Account"]);
  });
  it("owner / manager", () => {
    expect(navFor(session([grant("owner", A)])).map((i) => i.label)).toEqual(["Properties", "Jobs", "Team", "Account"]);
  });
  it("manager who is also a cleaner gets the union", () => {
    expect(navFor(session([grant("manager", A), grant("cleaner", A)])).map((i) => i.label)).toEqual([
      "Properties",
      "Jobs",
      "My Jobs",
      "Team",
      "Account",
    ]);
  });
  it("admin adds Admin", () => {
    expect(navFor(session([grant("cleaner", A)], { isAdmin: true })).map((i) => i.label).at(-1)).toBe("Admin");
  });
  it("home routes", () => {
    expect(homeFor(session([grant("cleaner", A)]))).toBe("/pilot/today");
    expect(homeFor(session([grant("owner", A)]))).toBe("/pilot/properties");
    expect(homeFor(session([]))).toBe("/pilot/account");
  });
});
