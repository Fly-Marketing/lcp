import { redirect } from "next/navigation";

import { PageFrame } from "@/components/pilot/page-frame";
import { TeamPanel, type TeamView } from "@/components/pilot/team-panel";
import { requireSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";
import { getTeam } from "@/lib/pilot/service";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = await requireSession("/pilot/team");
  if (!session.isAdmin && !hasRole(session, "owner") && !hasRole(session, "manager")) redirect("/pilot/start");

  const teams = await getTeam(session);
  const groups: TeamView[] = teams.map((t) => ({
    buildingId: t.building.id,
    buildingName: t.building.name,
    managedBy: t.building.managementMode,
    canEdit: t.canEdit,
    cleaners: t.cleaners,
    managers: t.managers,
  }));

  return (
    <PageFrame session={session}>
      <div className="mx-auto w-full max-w-2xl">
        <TeamPanel groups={groups} />
      </div>
    </PageFrame>
  );
}
