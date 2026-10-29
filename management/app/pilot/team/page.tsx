import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Team now lives under Settings. Kept as a redirect so old links keep working.
export default function TeamPage() {
  redirect("/pilot/management?tab=team");
}
