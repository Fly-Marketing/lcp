"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { CollapsibleCard } from "@/components/pilot/collapsible-card";
import { UnitPanel } from "@/components/pilot/unit-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProperty, createUnit, updateProperty, updateUnit } from "@/app/pilot/admin/actions";
import type { AdminData } from "@/lib/auth/admin";

type Building = AdminData["buildings"][number];
type Unit = AdminData["units"][number];

const selectCls = "h-8 w-full rounded-lg border border-input bg-background px-2 text-sm";
const modeLabel = (mode: "lcp" | "self") => (mode === "self" ? "Self-managed" : "Managed by LCP");
const money = (value: number | null) => (value === null ? "No rate set" : `$${value.toFixed(2)}`);
const testBadge = (
  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Test</span>
);
const countBadge = (text: string) => (
  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{text}</span>
);

// Properties are dropdowns. Opening one shows its details, then its units. Each unit is a dropdown
// too, with its details editor and pricing. Adding and editing happen in place.
export function PropertyAdmin({ data }: { data: AdminData }) {
  const [adding, setAdding] = useState(false);
  const [openBuildings, setOpenBuildings] = useState<Record<string, boolean>>({});
  const [openUnits, setOpenUnits] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingUnitTo, setAddingUnitTo] = useState<string | null>(null);

  const ownerName = (customerId: string | null) => data.customers.find((c) => c.id === customerId)?.name ?? "No owner";
  const unitsOf = (buildingId: string) => data.units.filter((u) => u.buildingId === buildingId);
  const flip = (setter: typeof setOpenBuildings, key: string) => setter((o) => ({ ...o, [key]: !o[key] }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-xl font-semibold">Properties</h2>
          <p className="text-sm text-muted-foreground">Buildings, owners and units</p>
        </div>
        <Button onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="size-4" />
          Add property
        </Button>
      </div>

      {adding ? (
        <CollapsibleCard
          id="new-property"
          open
          onToggle={() => setAdding(false)}
          title={<span className="font-medium">New property</span>}
        >
          <PropertyForm
            data={data}
            onCancel={() => setAdding(false)}
            onDone={(id) => {
              setAdding(false);
              if (id) setOpenBuildings((o) => ({ ...o, [id]: true }));
            }}
          />
        </CollapsibleCard>
      ) : null}

      {data.buildings.map((b) => {
        const units = unitsOf(b.id);
        return (
          <CollapsibleCard
            key={b.id}
            id={`building-${b.id}`}
            open={!!openBuildings[b.id]}
            onToggle={() => flip(setOpenBuildings, b.id)}
            title={
              <>
                <span className="font-medium">{b.name}</span>
                {b.isTest ? testBadge : null}
                <span className="text-xs text-muted-foreground">
                  {modeLabel(b.mode)} · {ownerName(b.customerId)}
                </span>
              </>
            }
            badge={countBadge(`${units.length} ${units.length === 1 ? "unit" : "units"}`)}
          >
            <div className="flex flex-col gap-4">
              {editingId === b.id ? (
                <PropertyForm
                  data={data}
                  building={b}
                  onCancel={() => setEditingId(null)}
                  onDone={() => setEditingId(null)}
                />
              ) : (
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">Details</h3>
                    <Button variant="outline" size="sm" onClick={() => setEditingId(b.id)}>
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                  </div>
                  <dl className="grid gap-4 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Address</dt>
                      <dd className="mt-1">{b.address ?? "Not set"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Management</dt>
                      <dd className="mt-1">{modeLabel(b.mode)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Owner</dt>
                      <dd className="mt-1">{ownerName(b.customerId)}</dd>
                    </div>
                  </dl>
                </div>
              )}

              <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Units</h3>
                <Button size="sm" disabled={addingUnitTo !== null} onClick={() => setAddingUnitTo(b.id)}>
                  <Plus className="size-4" />
                  Add unit
                </Button>
              </div>

              {addingUnitTo === b.id ? (
                <NewUnitForm buildingId={b.id} onDone={() => setAddingUnitTo(null)} />
              ) : null}

              {units.map((u) => (
                <CollapsibleCard
                  key={u.id}
                  id={`unit-${u.id}`}
                  open={!!openUnits[u.id]}
                  onToggle={() => flip(setOpenUnits, u.id)}
                  title={<span className="font-medium">{u.name}</span>}
                  badge={<span className="text-sm text-muted-foreground">{money(u.rate)}</span>}
                >
                  <div className="flex flex-col gap-6">
                    <UnitPanel
                      unit={{
                        id: u.id,
                        name: u.name,
                        buildingName: b.name,
                        address: u.address,
                        accessInstructions: u.accessInstructions,
                        importantNotes: u.importantNotes,
                        specialRequirements: u.specialRequirements,
                        checklistItems: u.checklistItems,
                      }}
                      canEdit
                    />
                    <UnitPricingForm unit={u} />
                  </div>
                </CollapsibleCard>
              ))}

              {units.length === 0 && addingUnitTo !== b.id ? (
                <p className="text-sm text-muted-foreground">No units in this property yet.</p>
              ) : null}
              </div>
            </div>
          </CollapsibleCard>
        );
      })}

      {data.buildings.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground">No properties yet. Add the first one.</p>
      ) : null}
    </div>
  );
}

// Create or edit a property. Create also offers the test flag.
function PropertyForm({
  data,
  building,
  onCancel,
  onDone,
}: {
  data: AdminData;
  building?: Building;
  onCancel: () => void;
  onDone: (createdId?: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(building?.name ?? "");
  const [address, setAddress] = useState(building?.address ?? "");
  const [mode, setMode] = useState<"lcp" | "self">(building?.mode ?? "lcp");
  const [customerId, setCustomerId] = useState(building?.customerId ?? "");
  const [isTest, setIsTest] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const input = { name, address, mode, customerId: customerId || null };
      if (building) {
        const result = await updateProperty({ id: building.id, ...input });
        if (!result.success) {
          setError(result.message);
          toast.error(result.message);
          return;
        }
        toast.success("Property saved");
        onDone();
        return;
      }
      const result = await createProperty({ ...input, isTest });
      if (!result.success) {
        setError(result.message);
        toast.error(result.message);
        return;
      }
      toast.success("Property created");
      onDone(result.id);
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="property-name">Property name</Label>
        <Input id="property-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="property-address">Address (optional)</Label>
        <Input id="property-address" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="property-mode">Management</Label>
          <select id="property-mode" className={selectCls} value={mode} onChange={(e) => setMode(e.target.value as "lcp" | "self")}>
            <option value="lcp">Managed by LCP</option>
            <option value="self">Self-managed</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="property-owner">Owner (optional)</Label>
          <select id="property-owner" className={selectCls} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">No owner</option>
            {data.customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Owners are created in People.</p>
      {!building ? (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={isTest} onChange={(e) => setIsTest(e.target.checked)} />
          <span>
            Test property
            <span className="block text-xs text-muted-foreground">Marked as test data, so it&apos;s easy to find and remove.</span>
          </span>
        </label>
      ) : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" disabled={isPending} onClick={onCancel}>Cancel</Button>
        <Button disabled={isPending || !name.trim()} onClick={submit}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {building ? "Save property" : "Create property"}
        </Button>
      </div>
    </div>
  );
}

// Adds a unit inside the property. Its details and rate are edited on the unit's dropdown.
function NewUnitForm({ buildingId, onDone }: { buildingId: string; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [unitName, setUnitName] = useState("");
  const [rate, setRate] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createUnit({ buildingId, unitName, rate });
      if (!result.success) {
        setError(result.message);
        toast.error(result.message);
        return;
      }
      toast.success("Unit added");
      onDone();
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-primary/40 bg-card p-3 text-sm">
      <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
        <Input placeholder="Unit name" value={unitName} onChange={(e) => setUnitName(e.target.value)} aria-label="Unit name" />
        <Input placeholder="Rate ($)" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} aria-label="Standard cleaning rate" />
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" disabled={isPending} onClick={onDone}>Cancel</Button>
        <Button size="sm" disabled={isPending || !unitName.trim()} onClick={submit}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Add unit
        </Button>
      </div>
    </div>
  );
}

// Pricing and schedule for one unit: the standard rate the owner is charged, plus timing.
function UnitPricingForm({ unit }: { unit: Unit }) {
  const [isPending, startTransition] = useTransition();
  const [unitName, setUnitName] = useState(unit.name);
  const [address, setAddress] = useState(unit.address ?? "");
  const [rate, setRate] = useState(unit.rate != null ? String(unit.rate) : "");
  const [hours, setHours] = useState(unit.expectedHours != null ? String(unit.expectedHours) : "");
  const [checkoutTime, setCheckoutTime] = useState(unit.checkoutTime ?? "");

  function submit() {
    startTransition(async () => {
      const r = await updateUnit({ id: unit.id, unitName, address, rate, expectedHours: hours, checkoutTime });
      if (!r.success) return void toast.error(r.message);
      toast.success("Unit saved");
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold">Pricing and schedule</h3>
        <p className="text-xs text-muted-foreground">The standard rate is what the owner is charged for a regular clean.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="unit-name">Unit name</Label>
          <Input id="unit-name" value={unitName} onChange={(e) => setUnitName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="unit-address">Address (optional)</Label>
          <Input id="unit-address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="unit-rate">Standard cleaning rate ($)</Label>
          <Input id="unit-rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="unit-hours">Expected hours</Label>
          <Input id="unit-hours" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="unit-checkout">Checkout time</Label>
          <Input id="unit-checkout" type="time" value={checkoutTime} onChange={(e) => setCheckoutTime(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button disabled={isPending || !unitName.trim()} onClick={submit}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save unit
        </Button>
      </div>
    </div>
  );
}
