import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { PilotJobCard } from "@/components/pilot/job-card";
import { PilotTabs } from "@/components/pilot/pilot-tabs";
import { getStaffForToken, getCompletedJobsForStaff } from "@/lib/pilot/queries";
import { hashTokenForLookup } from "@/lib/pilot/links";

export const dynamic = "force-dynamic";

export default async function PilotHistoryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const staff = await getStaffForToken(hashTokenForLookup(token), token);

  if (!staff) {
    notFound();
  }

  const jobs = await getCompletedJobsForStaff(staff.id);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <div>
        <p className="text-sm text-muted-foreground">Hi {staff.name},</p>
        <h1 className="font-heading text-xl font-medium">Completed work</h1>
      </div>

      <PilotTabs token={token} />

      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing completed yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((job) => (
            <PilotJobCard
              key={job.id}
              token={token}
              job={job}
              footer={
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle2 className="size-4" />
                  <span>
                    Completed {job.completedAt ? new Date(job.completedAt).toLocaleString() : ""}
                  </span>
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
