import { redirect } from "next/navigation";

// Today is now part of Schedule. Kept as a redirect so old links keep working.
export default function TodayPage() {
  redirect("/pilot/jobs");
}
