// Normalizes North American numbers to E.164 (+1XXXXXXXXXX). Returns null if it isn't a plausible NANP number.
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = String(input).replace(/\D/g, "");
  let national: string;
  if (digits.length === 10) national = digits;
  else if (digits.length === 11 && digits.startsWith("1")) national = digits.slice(1);
  else return null;
  // NANP: area code and exchange cannot start with 0 or 1.
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(national)) return null;
  return `+1${national}`;
}

export function maskPhone(e164: string): string {
  return `***-***-${e164.slice(-4)}`;
}

export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "Not on file";
  const d = e164.replace(/\D/g, "").slice(-10);
  if (d.length !== 10) return e164;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
