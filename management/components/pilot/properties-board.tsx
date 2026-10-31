"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, CheckCircle2, ChevronDown, ChevronRight, Flag, Plus, Sparkles } from "lucide-react";

import { AddJobSheet, type AddJobUnit } from "@/components/pilot/add-job-form";
import { UnitPanel, type UnitView } from "@/components/pilot/unit-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UnitStatus } from "@/lib/pilot/status";

export interface BoardCard {
  unit: UnitView & { standardRate: number | null };
  status: UnitStatus;
  lastCleanDate: string | null;
  nextCleanDate: string | null;
  nextJobId: string | null;
  nextCleanStatus: string | null;
  openReports: number;
}
export interface BoardGroup {
  buildingId: string;
  buildingName: string;
  counts: Record<UnitStatus, number>;
  cards: BoardCard[];
  canAddJob: boolean;
  canEditUnits: boolean;
}

const STATUS_STYLE: Record<UnitStatus, { chip: string; icon: typeof CheckCircle2 }> = {
  Ready: { chip: "bg-green-100 text-green-800", icon: CheckCircle2 },
  "Needs clean": { chip: "bg-blue-100 text-blue-800", icon: Sparkles },
  Flagged: { chip: "bg-amber-100 text-amber-900", icon: Flag },
};

function fmt(date: string | null) {
  if (!date) return null;
  return new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// The next clean. When there is one, the whole card opens that job.
function NextCleanCard({ card }: { card: BoardCard }) {
  const body = (
    <>
      <CalendarClock className="size-5 shrink-0 text-primary" />
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next clean</p>
        {card.nextCleanDate ? (
          <p className="text-sm font-semibold">
            {fmt(card.nextCleanDate)}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {card.nextCleanStatus === "Accepted" ? "Accepted" : "Scheduled"}
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {card.lastCleanDate ? `No clean scheduled. Last clean ${fmt(card.lastCleanDate)}` : "No cleans yet"}
          </p>
        )}
      </div>
      {card.nextJobId ? <ChevronRight className="size-4 shrink-0 text-muted-foreground" /> : null}
    </>
  );
  const className = "flex items-center gap-3 rounded-xl border border-border bg-card p-4";
  if (!card.nextJobId) return <div className={className}>{body}</div>;
  return (
    <Link href={`/pilot/jobs/${card.nextJobId}`} className={`${className} transition-colors hover:bg-muted/40`}>
      {body}
    </Link>
  );
}

export function PropertiesBoard({ groups, today }: { groups: BoardGroup[]; today: string }) {
  const [selected, setSelected] = useState<{ card: BoardCard; group: BoardGroup } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addUnitId, setAddUnitId] = useState<string | undefined>();
  // Each property folds its units. The title and status tags are the toggle.
  const [folded, setFolded] = useState<Record<string, boolean>>({});

  const addUnits: AddJobUnit[] = groups
    .filter((g) => g.canAddJob)
    .flatMap((g) =>
      g.cards.map((c) => ({
        id: c.unit.id,
        name: c.unit.name,
        buildingName: g.buildingName,
        standardRate: c.unit.standardRate,
      }))
    );

  function openAdd(unitId?: string) {
    setAddUnitId(unitId);
    setAddOpen(true);
  }

  const list = (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Properties</h1>
          <p className="text-sm text-muted-foreground">Your units at a glance</p>
        </div>
        {addUnits.length > 0 ? (
          <Button onClick={() => openAdd()}>
            <Plus className="size-4" />
            Add cleaning job
          </Button>
        ) : null}
      </div>

      {groups.map((g) => (
        <section key={g.buildingId} className="flex flex-col gap-3">
          <button
            type="button"
            aria-expanded={!folded[g.buildingId]}
            onClick={() => setFolded((f) => ({ ...f, [g.buildingId]: !f[g.buildingId] }))}
            className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm transition-colors hover:bg-muted/40"
          >
            <h2 className="mr-2 font-heading text-lg font-semibold">{g.buildingName}</h2>
            {(["Ready", "Needs clean", "Flagged"] as UnitStatus[]).map((s) => (
              <span key={s} className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLE[s].chip)}>
                {g.counts[s]} {s.toLowerCase()}
              </span>
            ))}
            <ChevronDown
              aria-hidden
              className={cn("ml-auto size-4 shrink-0 text-muted-foreground transition-transform", !folded[g.buildingId] && "rotate-180")}
            />
          </button>

          {!folded[g.buildingId] ? (
          <div className="flex flex-col gap-2">
            {g.cards.map((c) => {
              const Icon = STATUS_STYLE[c.status].icon;
              const isSelected = selected?.card.unit.id === c.unit.id;
              return (
                <button
                  key={c.unit.id}
                  type="button"
                  onClick={() => setSelected({ card: c, group: g })}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors",
                    isSelected ? "border-primary ring-1 ring-primary" : "border-border hover:bg-muted/40"
                  )}
                >
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-semibold">{c.unit.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.status === "Flagged"
                        ? `${c.openReports > 0 ? "Issue reported" : "Needs attention"}`
                        : c.nextCleanDate
                          ? `Cleaning ${c.nextCleanStatus === "Accepted" ? "accepted" : "scheduled"} ${fmt(c.nextCleanDate)}`
                          : c.lastCleanDate
                            ? `Last clean: ${fmt(c.lastCleanDate)}`
                            : "No cleans yet"}
                    </p>
                  </div>
                  <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLE[c.status].chip)}>
                    <Icon className="size-3.5" />
                    {c.status}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
            {g.cards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No units in this property yet.</p>
            ) : null}
          </div>
          ) : null}
        </section>
      ))}
    </div>
  );

  const detail = selected ? (
    <div className="flex flex-col gap-4">
      <UnitPanel
        key={selected.card.unit.id}
        unit={{ ...selected.card.unit, buildingName: selected.group.buildingName }}
        canEdit={selected.group.canEditUnits}
        onBack={() => setSelected(null)}
      />
      <NextCleanCard card={selected.card} />
      {selected.group.canAddJob ? (
        <Button variant="outline" onClick={() => openAdd(selected.card.unit.id)}>
          <CalendarClock className="size-4" />
          Schedule a clean for {selected.card.unit.name}
        </Button>
      ) : null}
    </div>
  ) : null;

  return (
    <>
      {detail ? (
        <div className="grid gap-6 md:grid-cols-[minmax(0,380px)_1fr] md:items-start">
          <div className="hidden md:block md:max-h-[calc(100dvh-7rem)] md:overflow-y-auto">{list}</div>
          <div className="w-full max-w-md md:max-w-none md:rounded-2xl md:border md:border-border md:bg-background md:p-6">
            {detail}
          </div>
        </div>
      ) : (
        <div className="w-full">{list}</div>
      )}

      {addUnits.length > 0 ? (
        <AddJobSheet
          key={addUnitId ?? "any"}
          units={addUnits}
          open={addOpen}
          onOpenChange={setAddOpen}
          initialUnitId={addUnitId}
          today={today}
        />
      ) : null}
    </>
  );
}
