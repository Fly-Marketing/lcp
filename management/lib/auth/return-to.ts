export const DEFAULT_RETURN_TO = "/pilot/start";

// Only same-site pilot paths are allowed; anything else falls back to the default.
export function safeReturnTo(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return DEFAULT_RETURN_TO;
  if (!raw.startsWith("/pilot/")) return DEFAULT_RETURN_TO;
  if (raw.startsWith("//") || raw.includes("\\") || raw.includes("://")) return DEFAULT_RETURN_TO;
  if (/[\u0000-\u001f]/.test(raw)) return DEFAULT_RETURN_TO;
  return raw;
}
