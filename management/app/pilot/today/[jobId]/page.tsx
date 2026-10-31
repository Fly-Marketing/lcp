import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Today is now part of Schedule. Kept as a redirect so old links keep working.
export default async function TodayJobRedirect({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  redirect(`/pilot/jobs/${jobId}`);
}
