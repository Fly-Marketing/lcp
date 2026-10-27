"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changeAccountPhone,
  createAccount,
  createCustomer,
  issueLoginCode,
  revokeAccountDevices,
  setAccountActive,
  setBuildingMode,
  setBuildingOwner,
  setUnitRate,
} from "@/app/pilot/admin/actions";
import { formatPhone } from "@/lib/auth/phone";
import type { AdminData } from "@/lib/auth/admin";

const selectCls = "h-8 w-full rounded-lg border border-input bg-background px-2 text-sm";

export function AdminPanel({ data }: { data: AdminData }) {
  const [isPending, startTransition] = useTransition();
  const [issued, setIssued] = useState<{ code: string; phone: string } | null>(null);

  function run(fn: () => Promise<{ success: boolean; message?: string }>, ok: string) {
    startTransition(async () => {
      const r = await fn();
      if (!r.success) return void toast.error(r.message ?? "Something went wrong");
      toast.success(ok);
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-muted-foreground">People, phone numbers and building settings</p>
      </div>

      {issued ? (
        <div role="status" className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900">
          One-time login code for {formatPhone(issued.phone)}:{" "}
          <span className="font-mono text-lg font-semibold tracking-widest">{issued.code}</span>
          <p className="text-xs">Valid for 10 minutes and works once. They enter it on the sign-in screen with their number.</p>
          <Button size="xs" variant="ghost" onClick={() => setIssued(null)}>Hide</Button>
        </div>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Accounts</h2>
        {data.accounts.map((a) => (
          <AccountRow
            key={a.id}
            account={a}
            busy={isPending}
            onChangePhone={(phone) => run(() => changeAccountPhone(a.id, phone), "Phone updated and devices signed out")}
            onIssue={() =>
              startTransition(async () => {
                const r = await issueLoginCode(a.id);
                if (!r.success) return void toast.error(r.message);
                setIssued({ code: r.code, phone: r.phone });
              })
            }
            onRevoke={() => run(() => revokeAccountDevices(a.id), "Devices signed out")}
            onToggle={() => run(() => setAccountActive(a.id, !a.active), a.active ? "Account deactivated" : "Account activated")}
          />
        ))}
        <NewAccount data={data} busy={isPending} onCreate={(v) => run(() => createAccount(v), "Account created")} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Buildings</h2>
        {data.buildings.map((b) => (
          <div key={b.id} className="grid items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm sm:grid-cols-[1fr_160px_200px]">
            <span className="font-medium">{b.name}</span>
            <select
              className={selectCls}
              aria-label={`${b.name} management`}
              defaultValue={b.mode}
              disabled={isPending}
              onChange={(e) => run(() => setBuildingMode(b.id, e.target.value as "lcp" | "self"), "Management mode updated")}
            >
              <option value="lcp">Managed by LCP</option>
              <option value="self">Self-managed</option>
            </select>
            <select
              className={selectCls}
              aria-label={`${b.name} owner`}
              defaultValue={b.customerId ?? ""}
              disabled={isPending}
              onChange={(e) => run(() => setBuildingOwner(b.id, e.target.value || null), "Owner updated")}
            >
              <option value="">No owner</option>
              {data.customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        ))}
        <NewCustomer busy={isPending} onCreate={(n) => run(() => createCustomer(n), "Owner added")} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Standard cleaning rate (what owners are charged)</h2>
        {data.units.map((u) => (
          <RateRow key={u.id} unit={u} busy={isPending} onSave={(v) => run(() => setUnitRate(u.id, v), "Rate saved")} />
        ))}
      </section>
    </div>
  );
}

function AccountRow({
  account,
  busy,
  onChangePhone,
  onIssue,
  onRevoke,
  onToggle,
}: {
  account: AdminData["accounts"][number];
  busy: boolean;
  onChangePhone: (phone: string) => void;
  onIssue: () => void;
  onRevoke: () => void;
  onToggle: () => void;
}) {
  const [phone, setPhone] = useState("");
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium">{account.name || "(no name)"}</span>
        <span className="text-muted-foreground">{formatPhone(account.phone)}</span>
        {account.staffName ? <span className="text-xs text-muted-foreground">Staff: {account.staffName}</span> : null}
        {account.customerName ? <span className="text-xs text-muted-foreground">Owner: {account.customerName}</span> : null}
        <span className="text-xs text-muted-foreground">{account.devices} trusted device{account.devices === 1 ? "" : "s"}</span>
        {!account.active ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">Inactive</span> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input className="h-8 w-44" placeholder="New phone number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="New phone number" />
        <Button size="sm" variant="outline" disabled={busy || !phone} onClick={() => { onChangePhone(phone); setPhone(""); }}>
          Change number
        </Button>
        <Button size="sm" variant="outline" disabled={busy || !account.active} onClick={onIssue}>
          Give login code
        </Button>
        <Button size="sm" variant="ghost" disabled={busy || account.devices === 0} onClick={onRevoke}>
          Sign out devices
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onToggle}>
          {account.active ? "Deactivate" : "Activate"}
        </Button>
      </div>
    </div>
  );
}

function NewAccount({
  data,
  busy,
  onCreate,
}: {
  data: AdminData;
  busy: boolean;
  onCreate: (v: { name: string; phone: string; staffId: string | null; customerId: string | null }) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [staffId, setStaffId] = useState("");
  const [customerId, setCustomerId] = useState("");
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3">
      <p className="text-sm font-medium">Add a person</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-1"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="flex flex-col gap-1"><Label>Mobile number</Label><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div className="flex flex-col gap-1">
          <Label>Link to cleaner (optional)</Label>
          <select className={selectCls} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            <option value="">Not a cleaner</option>
            {data.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Link to owner (optional)</Label>
          <select className={selectCls} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Not an owner</option>
            {data.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <Button
        className="self-end"
        disabled={busy || !name || !phone}
        onClick={() => {
          onCreate({ name, phone, staffId: staffId || null, customerId: customerId || null });
          setName(""); setPhone(""); setStaffId(""); setCustomerId("");
        }}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Create account
      </Button>
    </div>
  );
}

function NewCustomer({ busy, onCreate }: { busy: boolean; onCreate: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-3">
      <Input placeholder="New owner name" value={name} onChange={(e) => setName(e.target.value)} aria-label="New owner name" />
      <Button disabled={busy || !name} onClick={() => { onCreate(name); setName(""); }}>Add owner</Button>
    </div>
  );
}

function RateRow({ unit, busy, onSave }: { unit: AdminData["units"][number]; busy: boolean; onSave: (v: string) => void }) {
  const [value, setValue] = useState(unit.rate != null ? String(unit.rate) : "");
  return (
    <div className="grid items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm sm:grid-cols-[1fr_120px_auto]">
      <span>{unit.name} <span className="text-xs text-muted-foreground">· {unit.buildingName}</span></span>
      <Input inputMode="decimal" placeholder="Rate ($)" value={value} onChange={(e) => setValue(e.target.value)} aria-label={`${unit.name} rate`} />
      <Button size="sm" variant="outline" disabled={busy} onClick={() => onSave(value)}>Save</Button>
    </div>
  );
}
