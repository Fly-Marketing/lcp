import { redirect } from "next/navigation";

import { PageFrame } from "@/components/pilot/page-frame";
import { PropertiesBoard, type BoardGroup } from "@/components/pilot/properties-board";
import { requireSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";
import { ownerStatus } from "@/lib/pilot/status";
import { propertiesBoard } from "@/lib/pilot/service";
import { todayInEdmonton } from "@/lib/pilot/validation";

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  const session = await requireSession("/pilot/properties");
  if (!session.isAdmin && !hasRole(session, "owner") && !hasRole(session, "manager")) {
    redirect("/pilot/start");
  }

  const groups = await propertiesBoard(session);
  const view: BoardGroup[] = groups.map((g) => ({
    buildingId: g.building.id,
    buildingName: g.building.name,
    counts: g.counts,
    canAddJob: g.canAddJob,
    canEditUnits: g.canEditUnits,
    cards: g.cards.map((c) => ({
      unit: {
        id: c.unit.id,
        name: c.unit.name,
        buildingName: g.building.name,
        address: c.unit.address,
        accessInstructions: c.unit.accessInstructions,
        importantNotes: c.unit.importantNotes,
        specialRequirements: c.unit.specialRequirements,
        checklistItems: c.unit.checklistItems,
        standardRate: c.unit.standardRate,
      },
      status: c.status,
      lastCleanDate: c.lastCleanDate,
      nextCleanDate: c.nextJob?.checkoutDate ?? null,
      nextJobId: c.nextJob?.id ?? null,
      nextCleanStatus: c.nextJob ? ownerStatus(c.nextJob) : null,
      openReports: c.openReports,
    })),
  }));

  return (
    <PageFrame session={session}>
      {view.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No properties are linked to your account yet. Contact LCP to get set up.
        </p>
      ) : (
        <PropertiesBoard groups={view} today={todayInEdmonton()} />
      )}
    </PageFrame>
  );
}
