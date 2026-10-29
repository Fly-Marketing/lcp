import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Admin tools now live under Settings. Kept as a redirect so old links keep working.
export default function AdminPage() {
  redirect("/pilot/management?tab=accounts");
}
