import { Building2, Calendar } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { RoomStateBadge } from "@/components/units/room-state-badge";
import { OccupancyBadge } from "@/components/units/occupancy-badge";
import { CleanStatusBadge } from "@/components/units/clean-status-badge";
import { getAllUnits } from "@/lib/airtable/queries";

export const dynamic = "force-dynamic";

export default async function UnitsPage() {
  const units = await getAllUnits();

  const unitsByProperty = units.reduce(
    (acc, unit) => {
      const property = unit.propertyName || "Unknown Property";
      if (!acc[property]) {
        acc[property] = [];
      }
      acc[property].push(unit);
      return acc;
    },
    {} as Record<string, typeof units>
  );

  const sortedProperties = Object.keys(unitsByProperty).sort();

  return (
    <div>
      <PageHeader title="Units" subtitle="Status across all properties" />

      <div className="space-y-8">
        {sortedProperties.map((property) => (
          <div key={property}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {property}
            </h2>
            <div className="space-y-3">
              {unitsByProperty[property].map((unit) => (
          <div
            key={unit.id}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">
                  {unit.unitLabel}
                </h3>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                  <Building2 className="size-3.5 shrink-0" />
                  {unit.propertyName}
                  {unit.area ? ` · ${unit.area}` : ""}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {unit.roomState !== "Occupied" && (
                  <RoomStateBadge state={unit.roomState} />
                )}
                {unit.currentStayCheckout ? (
                  <OccupancyBadge checkoutDate={unit.currentStayCheckout} />
                ) : (
                  <CleanStatusBadge isClean={unit.isClean} />
                )}
              </div>
            </div>

            {unit.currentStayCheckout || unit.nextCheckin || unit.lastClean ? (
              <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm text-muted-foreground">
                {unit.currentStayCheckout ? (
                  <div>
                    <p className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 shrink-0" />
                      Checkout: {unit.currentStayCheckout}
                    </p>
                  </div>
                ) : null}
                {unit.nextCheckin ? (
                  <p className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 shrink-0" />
                    Next check-in: {unit.nextCheckin}
                  </p>
                ) : null}
                {unit.lastClean ? (
                  <p className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 shrink-0" />
                    Last cleaned: {unit.lastClean}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
              ))}
            </div>
          </div>
        ))}

        {units.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No units found.
          </p>
        ) : null}
      </div>
    </div>
  );
}
