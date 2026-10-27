import "server-only";
import { getServiceClient } from "@/lib/pilot/supabase";

export interface AccountRow {
  id: string;
  phone_e164: string;
  display_name: string | null;
  staff_id: string | null;
  customer_id: string | null;
  active: boolean;
}

const ACCOUNT_SELECT = "id, phone_e164, display_name, staff_id, customer_id, active";

export async function findAccountByPhone(phoneE164: string): Promise<AccountRow | null> {
  const { data } = await getServiceClient()
    .from("accounts")
    .select(ACCOUNT_SELECT)
    .eq("phone_e164", phoneE164)
    .eq("active", true)
    .maybeSingle();
  return (data as AccountRow | null) ?? null;
}

export async function getAccount(id: string): Promise<AccountRow | null> {
  const { data } = await getServiceClient()
    .from("accounts")
    .select(ACCOUNT_SELECT)
    .eq("id", id)
    .eq("active", true)
    .maybeSingle();
  return (data as AccountRow | null) ?? null;
}
