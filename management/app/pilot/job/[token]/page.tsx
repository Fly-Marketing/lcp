import { notFound } from "next/navigation";

import { PilotJobCard } from "@/components/pilot/job-card";
import { PilotTabs } from "@/components/pilot/pilot-tabs";
import { JobActions } from "@/components/pilot/job-actions";
import { getStaffForToken, getJobsForStaff } from "@/lib/pilot/queries";
import { hashTokenForLookup } from "@/lib/pilot/links";
import { usesFakeData } from "@/lib/pilot/mode";

export const dynamic = "force-dynamic";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default async function PilotJobPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const staff = await getStaffForToken(hashTokenForLookup(token), token);

  if (!staff) {
    notFound();
  }

  const jobs = await getJobsForStaff(staff.id);
  const today = todayISO();
  const todayJobs = jobs.filter((j) => j.checkoutDate === today);
  const laterJobs = jobs.filter((j) => j.checkoutDate !== today);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      {usesFakeData() ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          FAKE DATA MODE — nothing here touches the real database
        </div>
      ) : null}

      <div>
        <p className="text-sm text-muted-foreground">Hi {staff.name},</p>
        <h1 className="font-heading text-xl font-medium">Your turnovers</h1>
      </div>

      <PilotTabs token={token} />

      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open jobs right now.</p>
      ) : (
        <>
          {todayJobs.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Today</h2>
              {todayJobs.map((job) => (
                <PilotJobCard key={job.id} job={job} isToday>
                  <JobActions token={token} job={job} staffId={staff.id} />
                </PilotJobCard>
              ))}
            </div>
          ) : null}

          {laterJobs.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Later this week</h2>
              {laterJobs.map((job) => (
                <PilotJobCard key={job.id} job={job}>
                  <JobActions token={token} job={job} staffId={staff.id} />
                </PilotJobCard>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
