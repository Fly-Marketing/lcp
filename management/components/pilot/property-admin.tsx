"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { MasterDetail } from "@/components/pilot/master-detail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProperty, createUnit, updateProperty, updateUnit } from "@/app/pilot/admin/actions";
import { UnitPanel } from "@/components/pilot/unit-panel";
import type { AdminData } from "@/lib/auth/admin";
import { cn } from "@/lib/utils";

type Building = AdminData["buildings"][number];
type Unit = AdminData["units"][number];

const selectCls = "h-8 w-full rounded-lg border border-input bg-background px-2 text-sm";
const modeLabel = (mode: "lcp" | "self") => (mode === "self" ? "Self-managed" : "Managed by LCP");
const money = (value: number | null) => (value === null ? "No rate set" : `$${value.toFixed(2)}`);

// Properties follow the same pattern as the Properties page: a list of cards and a full card for
// the selected one. Adding and editing happen inside that panel, with no extra side sheet.
export function PropertyAdmin({ data }: { data: AdminData }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<"create" | "edit" | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  // Only used for adding a unit. Editing happens on the unit card.
  const [addingUnit, setAddingUnit] = useState(false);

  const selected = data.buildings.find((b) => b.id === selectedId) ?? null;
  const ownerName = (customerId: string | null) => data.customers.find((c) => c.id === customerId)?.name ?? "No owner";
  const unitsOf = (buildingId: string) => data.units.filter((u) => u.buildingId === buildingId);

  function select(id: string | null) {
    setSelectedId(id);
    setForm(null);
    setSelectedUnitId(null);
    setAddingUnit(false);
  }

  const list = (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-xl font-semibold">Properties</h2>
          <p className="text-sm text-muted-foreground">Buildings, owners and units</p>
        </div>
        <Button
          onClick={() => {
            select(null);
            setForm("create");
          }}
        >
          <Plus className="size-4" />
          Add property
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {data.buildings.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => select(b.id)}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors",
              b.id === selectedId && form !== "create" ? "border-primary ring-1 ring-primary" : "border-border hover:bg-muted/40"
            )}
          >
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold">
                {b.name}
                {b.isTest ? <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Test</span> : null}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {modeLabel(b.mode)} · {ownerName(b.customerId)}
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {unitsOf(b.id).length} {unitsOf(b.id).length === 1 ? "unit" : "units"}
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
        {data.buildings.length === 0 ? <p className="text-sm text-muted-foreground">No properties yet. Add the first one.</p> : null}
      </div>
    </div>
  );

  let detail: React.ReactNode = null;
  if (form === "create") {
    detail = (
      <PropertyForm
        key="new"
        data={data}
        onCancel={() => setForm(null)}
        onDone={(id) => {
          setForm(null);
          if (id) setSelectedId(id);
        }}
      />
    );
  } else if (selected && selectedUnitId && unitsOf(selected.id).some((u) => u.id === selectedUnitId)) {
    const unit = unitsOf(selected.id).find((u) => u.id === selectedUnitId)!;
    detail = (
      <UnitDetail
        key={unit.id}
        unit={unit}
        buildingName={selected.name}
        onBack={() => setSelectedUnitId(null)}
      />
    );
  } else if (selected) {
    detail = (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => select(null)}
          className="flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground md:hidden"
        >
          <ChevronLeft className="size-4" />
          All properties
        </button>

        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-heading text-xl font-semibold">{selected.name}</h2>
            <p className="text-sm text-muted-foreground">{modeLabel(selected.mode)}</p>
          </div>
          {form !== "edit" ? (
            <Button variant="outline" size="sm" onClick={() => setForm("edit")}>
              <Pencil className="size-4" />
              Edit
            </Button>
          ) : null}
        </div>

        {form === "edit" ? (
          <PropertyForm
            key={selected.id}
            inline
            data={data}
            building={selected}
            onCancel={() => setForm(null)}
            onDone={() => setForm(null)}
          />
        ) : (
        <dl className="grid gap-4 rounded-xl border border-border bg-card p-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Address</dt>
            <dd className="mt-1">{selected.address ?? "Not set"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Management</dt>
            <dd className="mt-1">{modeLabel(selected.mode)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Owner</dt>
            <dd className="mt-1">{ownerName(selected.customerId)}</dd>
          </div>
        </dl>
        )}

        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Units</h3>
            <p className="text-xs text-muted-foreground">Select a unit to edit its details and rate</p>
          </div>
          <Button size="sm" disabled={addingUnit} onClick={() => setAddingUnit(true)}>
            <Plus className="size-4" />
            Add unit
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {addingUnit ? <NewUnitForm key="new-unit" buildingId={selected.id} onDone={() => setAddingUnit(false)} /> : null}
          {unitsOf(selected.id).map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => setSelectedUnitId(u.id)}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left text-sm transition-colors hover:bg-muted/40"
            >
              <span className="flex-1 truncate font-medium">{u.name}</span>
              <span className="text-muted-foreground">{money(u.rate)}</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
          {unitsOf(selected.id).length === 0 && !addingUnit ? (
            <p className="text-sm text-muted-foreground">No units in this property yet.</p>
          ) : null}
        </div>
      </div>
    );
  }

  return <MasterDetail list={list} detail={detail} />;
}

// Create or edit a property, shown in the detail panel in place of the property card.
function PropertyForm({
  data,
  building,
  inline = false,
  onCancel,
  onDone,
}: {
  data: AdminData;
  building?: Building;
  // inline: replaces the details card in place (edit). Otherwise it fills the panel (add).
  inline?: boolean;
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

  const fields = (
    <>
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
      <p className="text-xs text-muted-foreground">Owners are created in Accounts.</p>
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
    </>
  );

  const buttons = (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" disabled={isPending} onClick={onCancel}>Cancel</Button>
      <Button disabled={isPending || !name.trim()} onClick={submit}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {building ? "Save property" : "Create property"}
      </Button>
    </div>
  );

  if (inline) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        {fields}
        {buttons}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onCancel}
        className="flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground md:hidden"
      >
        <ChevronLeft className="size-4" />
        Back
      </button>

      <div>
        <h2 className="font-heading text-xl font-semibold">Add property</h2>
        <p className="text-sm text-muted-foreground">Create the property first, then add its units and rates.</p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">{fields}</div>
      {buttons}
    </div>
  );
}

// Adds a unit inside the property. Its details and rate are edited on the unit card.
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

// The full unit card: the same details editor the owner and cleaner views use, plus pricing and schedule.
function UnitDetail({ unit, buildingName, onBack }: { unit: Unit; buildingName: string; onBack: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <button type="button" onClick={onBack} className="flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Back to {buildingName}
      </button>

      <UnitPanel
        unit={{
          id: unit.id,
          name: unit.name,
          buildingName,
          address: unit.address,
          accessInstructions: unit.accessInstructions,
          importantNotes: unit.importantNotes,
          specialRequirements: unit.specialRequirements,
          checklistItems: unit.checklistItems,
        }}
        canEdit
      />

      <UnitPricingForm unit={unit} />
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
