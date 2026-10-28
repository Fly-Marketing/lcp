import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// My Jobs is now the Jobs list. Kept as a redirect so old links keep working.
export default function MyJobsPage() {
  redirect("/pilot/jobs");
}
