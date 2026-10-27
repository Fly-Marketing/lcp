// All auth tunables in one place.
export const AUTH = {
  codeTtlMs: 10 * 60 * 1000,
  maxCodeAttempts: 5,
  // Trusted device: slides forward on use, but never past the hard cap from the last SMS verification.
  deviceIdleDays: 30,
  deviceHardDays: 90,
  // Rate limits (events counted in auth_events).
  limits: {
    codesPerPhone15Min: 3,
    codesPerPhonePerDay: 10,
    codesPerIpPerHour: 20,
    failedVerifiesPerPhone15Min: 10,
  },
  // Avoid a DB write on every request.
  touchIntervalMs: 60 * 60 * 1000,
} as const;

export const DAY_MS = 24 * 60 * 60 * 1000;

export function deviceCookieName(): string {
  // __Host- prefix requires Secure + Path=/ + no Domain, so only use it in production (https).
  return process.env.NODE_ENV === "production" ? "__Host-lcp_device" : "lcp_device";
}
