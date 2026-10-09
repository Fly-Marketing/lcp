import { notFound } from "next/navigation";

import { HistoryRow } from "@/components/pilot/history-row";
import { PilotShell } from "@/components/pilot/pilot-shell";
import { getStaffForToken, getCompletedJobsForStaff } from "@/lib/pilot/queries";
import { hashTokenForLookup } from "@/lib/pilot/links";

export const dynamic = "force-dynamic";

function daysAgo(dateIso: string | null): number {
  if (!dateIso) return Infinity;
  const diffMs = Date.now() - new Date(dateIso).getTime();
  return diffMs / (1000 * 60 * 60 * 24);
}

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
  const thisWeek = jobs.filter((j) => daysAgo(j.completedAt) <= 7);
  const earlier = jobs.filter((j) => daysAgo(j.completedAt) > 7);

  return (
    <PilotShell token={token} staffName={staff.name}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Completed work</h1>
          <p className="text-sm text-muted-foreground">Your finished turnarounds</p>
        </div>

        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing completed yet.</p>
        ) : (
          <>
            {thisWeek.length > 0 ? (
              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground">This week</h2>
                <div className="flex flex-col gap-2">
                  {thisWeek.map((job) => (
                    <HistoryRow key={job.id} token={token} job={job} />
                  ))}
                </div>
              </div>
            ) : null}

            {earlier.length > 0 ? (
              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground">Earlier this month</h2>
                <div className="flex flex-col gap-2">
                  {earlier.map((job) => (
                    <HistoryRow key={job.id} token={token} job={job} />
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </PilotShell>
  );
}
