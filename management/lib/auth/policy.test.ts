import { describe, expect, it } from "vitest";
import { codeState, deviceExpiry, deviceState, shouldTouch, slideIdle } from "@/lib/auth/policy";
import { AUTH, DAY_MS } from "@/lib/auth/config";

const t0 = new Date("2026-01-01T00:00:00Z");
const plus = (d: Date, days: number) => new Date(d.getTime() + days * DAY_MS);

describe("device expiry", () => {
  it("sets idle window and a 90-day hard cap from verification", () => {
    const { idle, hard } = deviceExpiry(t0, t0);
    expect(idle.getTime() - t0.getTime()).toBe(AUTH.deviceIdleDays * DAY_MS);
    expect(hard.getTime() - t0.getTime()).toBe(90 * DAY_MS);
  });

  it("sliding never extends past the hard cap", () => {
    const { hard } = deviceExpiry(t0, t0);
    const dev = { hard_expires_at: hard.toISOString() };
    expect(slideIdle(dev, plus(t0, 10)).getTime()).toBe(plus(t0, 40).getTime());
    expect(slideIdle(dev, plus(t0, 80)).getTime()).toBe(hard.getTime()); // capped
  });

  it("classifies device state", () => {
    const base = {
      revoked_at: null,
      idle_expires_at: plus(t0, 30).toISOString(),
      hard_expires_at: plus(t0, 90).toISOString(),
    };
    expect(deviceState(base, plus(t0, 1))).toBe("ok");
    expect(deviceState(base, plus(t0, 31))).toBe("idle_expired");
    expect(deviceState({ ...base, idle_expires_at: plus(t0, 200).toISOString() }, plus(t0, 91))).toBe("hard_expired");
    expect(deviceState({ ...base, revoked_at: t0.toISOString() }, plus(t0, 1))).toBe("revoked");
  });

  it("touches at most once per interval", () => {
    expect(shouldTouch(t0.toISOString(), new Date(t0.getTime() + 60_000))).toBe(false);
    expect(shouldTouch(t0.toISOString(), new Date(t0.getTime() + AUTH.touchIntervalMs))).toBe(true);
  });
});

describe("code state", () => {
  const fresh = {
    consumed_at: null,
    expires_at: new Date(t0.getTime() + AUTH.codeTtlMs).toISOString(),
    attempts: 0,
  };
  it("ok when fresh", () => expect(codeState(fresh, t0)).toBe("ok"));
  it("expired after TTL", () => expect(codeState(fresh, new Date(t0.getTime() + AUTH.codeTtlMs + 1))).toBe("expired"));
  it("consumed codes are dead (single use)", () =>
    expect(codeState({ ...fresh, consumed_at: t0.toISOString() }, t0)).toBe("consumed"));
  it("locks after max attempts", () => {
    expect(codeState({ ...fresh, attempts: AUTH.maxCodeAttempts - 1 }, t0)).toBe("ok");
    expect(codeState({ ...fresh, attempts: AUTH.maxCodeAttempts }, t0)).toBe("locked");
  });
});
