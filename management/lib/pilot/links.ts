import "server-only";
import { randomBytes, createHash } from "crypto";
import { getServiceClient } from "@/lib/pilot/supabase";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const LINK_LIFETIME_MS = 72 * 60 * 60 * 1000; // 72h — short-lived, governs the link not the session

export async function issueCleanerLink(staffId: string): Promise<{ token: string }> {
  const token = randomBytes(32).toString("base64url");
  const supabase = getServiceClient();

  const { error } = await supabase.from("access_links").insert({
    token_hash: hashToken(token),
    persona: "cleaner",
    staff_id: staffId,
    expires_at: new Date(Date.now() + LINK_LIFETIME_MS).toISOString(),
  });

  if (error) throw new Error(`Failed to issue cleaner link: ${error.message}`);
  return { token };
}

export function hashTokenForLookup(token: string): string {
  return hashToken(token);
}
