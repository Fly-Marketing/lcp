import "server-only";
import { getServiceClient } from "@/lib/pilot/supabase";
import { randomToken, sha256 } from "@/lib/auth/crypto";
import { deviceExpiry, deviceState, shouldTouch, slideIdle } from "@/lib/auth/policy";

export interface DeviceRow {
  id: string;
  account_id: string;
  user_agent: string | null;
  verified_at: string;
  last_seen_at: string;
  idle_expires_at: string;
  hard_expires_at: string;
  revoked_at: string | null;
}

const DEVICE_SELECT =
  "id, account_id, user_agent, verified_at, last_seen_at, idle_expires_at, hard_expires_at, revoked_at";

// Called right after a successful SMS verification. Returns the raw cookie token (never stored).
export async function createDevice(accountId: string, userAgent: string | null) {
  const token = randomToken(32);
  const now = new Date();
  const { idle, hard } = deviceExpiry(now, now);
  const { data, error } = await getServiceClient()
    .from("trusted_devices")
    .insert({
      account_id: accountId,
      token_hash: sha256(token),
      user_agent: userAgent ? userAgent.slice(0, 300) : null,
      verified_at: now.toISOString(),
      last_seen_at: now.toISOString(),
      idle_expires_at: idle.toISOString(),
      hard_expires_at: hard.toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("Could not register this device");
  return { token, deviceId: data.id as string, hardExpiresAt: hard };
}

// Validates the cookie token against the server-side record. Slides the idle window (at most hourly).
export async function resolveDevice(rawToken: string): Promise<DeviceRow | null> {
  if (!rawToken || rawToken.length < 20 || rawToken.length > 200) return null;
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("trusted_devices")
    .select(DEVICE_SELECT)
    .eq("token_hash", sha256(rawToken))
    .maybeSingle();
  if (!data) return null;
  const device = data as DeviceRow;
  const now = new Date();
  if (deviceState(device, now) !== "ok") return null;

  if (shouldTouch(device.last_seen_at, now)) {
    await supabase
      .from("trusted_devices")
      .update({ last_seen_at: now.toISOString(), idle_expires_at: slideIdle(device, now).toISOString() })
      .eq("id", device.id);
  }
  return device;
}

export async function listDevices(accountId: string): Promise<DeviceRow[]> {
  const { data } = await getServiceClient()
    .from("trusted_devices")
    .select(DEVICE_SELECT)
    .eq("account_id", accountId)
    .is("revoked_at", null)
    .gt("hard_expires_at", new Date().toISOString())
    .order("last_seen_at", { ascending: false });
  return (data as DeviceRow[] | null) ?? [];
}

export async function revokeDevice(accountId: string, deviceId: string) {
  await getServiceClient()
    .from("trusted_devices")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", deviceId)
    .eq("account_id", accountId)
    .is("revoked_at", null);
}

// Revoke every device for an account, optionally keeping one.
export async function revokeAllDevices(accountId: string, exceptDeviceId?: string | null) {
  let q = getServiceClient()
    .from("trusted_devices")
    .update({ revoked_at: new Date().toISOString() })
    .eq("account_id", accountId)
    .is("revoked_at", null);
  if (exceptDeviceId) q = q.neq("id", exceptDeviceId);
  await q;
}
