import { redirect } from "next/navigation";

// Accepted-job detail now lives under Jobs. Kept as a redirect so old links keep working.
export default async function MyJobRedirect({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  redirect(`/pilot/jobs/${jobId}`);
}
