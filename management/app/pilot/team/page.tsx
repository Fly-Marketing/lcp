import Link from "next/link";
import { redirect } from "next/navigation";

import { PageFrame } from "@/components/pilot/page-frame";
import { TeamPanel, type TeamView } from "@/components/pilot/team-panel";
import { AdminPanel } from "@/components/pilot/admin-panel";
import { loadAdminData } from "@/lib/auth/admin";
import { requireSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";
import { usesFakeData } from "@/lib/pilot/mode";
import { getTeam } from "@/lib/pilot/service";
import { cn } from "@/lib/utils";
import type { Session } from "@/lib/auth/types";

export const dynamic = "force-dynamic";

// Team is where people are managed. Admins also get an Admin tab for accounts and setup.
export default async function TeamPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const session = await requireSession("/pilot/team");
  if (!session.isAdmin && !hasRole(session, "owner") && !hasRole(session, "manager")) redirect("/pilot/start");

  const onAdminTab = session.isAdmin && tab === "admin";

  return (
    <PageFrame session={session}>
      {session.isAdmin ? (
        <div className="mx-auto mb-4 flex w-full max-w-2xl gap-2 text-sm">
          {[
            { href: "/pilot/team", label: "Team", active: !onAdminTab },
            { href: "/pilot/team?tab=admin", label: "Admin", active: onAdminTab },
          ].map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "rounded-full border px-3 py-1",
                t.active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>
      ) : null}

      {onAdminTab ? (
        <div className="mx-auto w-full max-w-3xl">
          {usesFakeData() ? (
            <p className="text-sm text-muted-foreground">The admin tools need the real database (PILOT_USE_FAKE_DATA=false).</p>
          ) : (
            <AdminPanel data={await loadAdminData()} />
          )}
        </div>
      ) : (
        <TeamGroups session={session} />
      )}
    </PageFrame>
  );
}

async function TeamGroups({ session }: { session: Session }) {
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
    <div className="mx-auto w-full max-w-2xl">
      <TeamPanel groups={groups} />
    </div>
  );
}
