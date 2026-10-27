import { redirect } from "next/navigation";

import { homeFor } from "@/lib/auth/nav";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// Role-aware landing: sends each person to their own home screen.
export default async function StartPage() {
  const session = await getSession();
  if (!session) redirect("/pilot/signin");
  redirect(homeFor(session));
}
