import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "lcp_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function requireSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing required environment variable: SESSION_SECRET");
  }
  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", requireSecret()).update(value).digest("base64url");
}

function encode(staffId: string, expiresAt: number): string {
  const payload = `${staffId}.${expiresAt}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function decode(token: string): { staffId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [staffId, expiresAtStr, signature] = parts;

  const payload = `${staffId}.${expiresAtStr}`;
  const expectedSignature = sign(payload);

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

  return { staffId };
}

export async function createSession(staffId: string): Promise<void> {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const token = encode(staffId, expiresAt);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getSessionStaffId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = decode(token);
  return session?.staffId ?? null;
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
