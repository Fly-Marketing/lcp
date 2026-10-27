import { describe, expect, it } from "vitest";
import {
  addDays,
  cleanText,
  isValidDate,
  todayInEdmonton,
  validateChecklist,
  validateJobDate,
  validatePrice,
  validateTime,
} from "@/lib/pilot/validation";

describe("dates", () => {
  it("validates real calendar dates only", () => {
    expect(isValidDate("2026-10-27")).toBe(true);
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("26-10-27")).toBe(false);
    expect(isValidDate("")).toBe(false);
  });
  it("accepts today..+1 year, rejects past and far future", () => {
    expect(validateJobDate("2026-10-26", "2026-10-26")).toBeNull();
    expect(validateJobDate("2026-10-25", "2026-10-26")).not.toBeNull();
    expect(validateJobDate("2027-10-26", "2026-10-26")).toBeNull();
    expect(validateJobDate("2027-10-27", "2026-10-26")).not.toBeNull();
    expect(validateJobDate("nope", "2026-10-26")).not.toBeNull();
  });
  it("addDays crosses month boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });
  it("todayInEdmonton honours the timezone (UTC 03:00 is still the previous Edmonton day)", () => {
    expect(todayInEdmonton(new Date("2026-10-27T03:00:00Z"))).toBe("2026-10-26");
    expect(todayInEdmonton(new Date("2026-10-27T15:00:00Z"))).toBe("2026-10-27");
  });
});

describe("time / text / price", () => {
  it("validates HH:MM", () => {
    expect(validateTime("")).toBeNull();
    expect(validateTime(null)).toBeNull();
    expect(validateTime("11:00")).toBeNull();
    expect(validateTime("9:30")).toBeNull();
    expect(validateTime("25:00")).not.toBeNull();
    expect(validateTime("11:60")).not.toBeNull();
    expect(validateTime("noon")).not.toBeNull();
  });
  it("cleans and caps text", () => {
    expect(cleanText("  hi  ", 10)).toBe("hi");
    expect(cleanText("   ", 10)).toBeNull();
    expect(cleanText("abcdef", 3)).toBe("abc");
  });
  it("validates price", () => {
    expect(validatePrice("120")).toBe(120);
    expect(validatePrice(99.999)).toBe(100);
    expect(validatePrice(-1)).toBeNull();
    expect(validatePrice("abc")).toBeNull();
    expect(validatePrice(1e9)).toBeNull();
  });
});

describe("validateChecklist", () => {
  const ok = [{ id: "trash", title: "Trash out", description: "All trash" }, { id: "linens", title: "Linens" }];
  it("accepts well-formed lists", () => {
    const r = validateChecklist(ok);
    expect(r.ok).toBe(true);
  });
  it.each([
    ["not an array", "x"],
    ["empty", []],
    ["bad id", [{ id: "Bad Id", title: "t" }]],
    ["duplicate ids", [{ id: "a", title: "t" }, { id: "a", title: "u" }]],
    ["missing title", [{ id: "a", title: " " }]],
    ["long title", [{ id: "a", title: "x".repeat(81) }]],
    ["long description", [{ id: "a", title: "t", description: "x".repeat(201) }]],
    ["non-object item", [null]],
  ])("rejects %s", (_n, input) => {
    expect(validateChecklist(input).ok).toBe(false);
  });
  it("rejects more than 30 items", () => {
    const many = Array.from({ length: 31 }, (_, i) => ({ id: `i${i}`, title: "t" }));
    expect(validateChecklist(many).ok).toBe(false);
  });
});
