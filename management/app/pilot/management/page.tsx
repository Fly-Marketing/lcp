import Link from "next/link";
import { redirect } from "next/navigation";

import { PageFrame } from "@/components/pilot/page-frame";
import { AccountAdmin } from "@/components/pilot/account-admin";
import { PropertyAdmin } from "@/components/pilot/property-admin";
import { TeamPanel, type TeamView } from "@/components/pilot/team-panel";
import { loadAdminData } from "@/lib/auth/admin";
import { hasRole } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import type { Session } from "@/lib/auth/types";
import { usesFakeData } from "@/lib/pilot/mode";
import { getTeam } from "@/lib/pilot/service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Tab = "team" | "accounts" | "properties";

// Team: owners, managers and admins. Accounts and Properties: admins only.
function tabsFor(session: Session): { key: Tab; label: string }[] {
  const tabs: { key: Tab; label: string }[] = [];
  if (session.isAdmin || hasRole(session, "owner") || hasRole(session, "manager")) tabs.push({ key: "team", label: "Team" });
  if (session.isAdmin) tabs.push({ key: "accounts", label: "Accounts" }, { key: "properties", label: "Properties" });
  return tabs;
}

export default async function ManagementPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const session = await requireSession("/pilot/management");
  const tabs = tabsFor(session);
  if (tabs.length === 0) redirect("/pilot/start");
  const active: Tab = tabs.find((t) => t.key === tab)?.key ?? tabs[0].key;

  return (
    <PageFrame session={session}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Management</h1>
          <p className="text-sm text-muted-foreground">Team, accounts and properties</p>
        </div>

        {tabs.length > 1 ? (
          <nav className="flex flex-wrap gap-2 text-sm" aria-label="Management sections">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={`/pilot/management?tab=${t.key}`}
                aria-current={t.key === active ? "page" : undefined}
                className={cn(
                  "rounded-full border px-3 py-1",
                  t.key === active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                )}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        ) : null}

        {active === "team" ? <TeamTab session={session} /> : null}
        {active === "accounts" ? <AdminTab view="accounts" /> : null}
        {active === "properties" ? <AdminTab view="properties" /> : null}
      </div>
    </PageFrame>
  );
}

async function TeamTab({ session }: { session: Session }) {
  const teams = await getTeam(session);
  const groups: TeamView[] = teams.map((t) => ({
    buildingId: t.building.id,
    buildingName: t.building.name,
    managedBy: t.building.managementMode,
    canEdit: t.canEdit,
    cleaners: t.cleaners,
    managers: t.managers,
  }));

  return <TeamPanel groups={groups} />;
}

async function AdminTab({ view }: { view: "accounts" | "properties" }) {
  if (usesFakeData()) {
    return <p className="text-sm text-muted-foreground">The admin tools need the real database (PILOT_USE_FAKE_DATA=false).</p>;
  }
  const data = await loadAdminData();
  return view === "accounts" ? <AccountAdmin data={data} /> : <PropertyAdmin data={data} />;
}
