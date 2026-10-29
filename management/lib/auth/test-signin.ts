import "server-only";
import { getServiceClient } from "@/lib/pilot/supabase";

// Test sign-in: preview deployments only, and only for accounts marked is_test. The admin issues
// the account a code from the Accounts screen, and the person enters it. No text is sent.
// Off everywhere else, including production.
export async function isTestSignIn(phoneE164: string): Promise<boolean> {
  if (process.env.VERCEL_ENV !== "preview" || process.env.PILOT_TEST_SIGNIN !== "true") return false;
  const { data } = await getServiceClient()
    .from("accounts")
    .select("id")
    .eq("phone_e164", phoneE164)
    .eq("is_test", true)
    .eq("active", true)
    .maybeSingle();
  return data !== null;
}
