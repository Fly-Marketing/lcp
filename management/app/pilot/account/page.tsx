import { redirect } from "next/navigation";
import { User } from "lucide-react";

import { PageFrame } from "@/components/pilot/page-frame";
import { AccountPanel, type DeviceView } from "@/components/pilot/account-panel";
import { getAccount } from "@/lib/auth/accounts";
import { listDevices } from "@/lib/auth/devices";
import { formatPhone } from "@/lib/auth/phone";
import { requireSession } from "@/lib/auth/session";
import { usesFakeData } from "@/lib/pilot/mode";

export const dynamic = "force-dynamic";

function describeAgent(ua: string | null): string {
  if (!ua) return "Unknown device";
  const os = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "Device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "Browser";
  return `${browser} on ${os}`;
}

function roleLabel(roles: string[]): string {
  return roles.length ? roles.map((r) => r[0].toUpperCase() + r.slice(1)).join(" · ") : "Member";
}

// My account stands on its own, opened from the header. Team and admin tools now live under Management.
export default async function AccountPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  if (tab === "team" || tab === "accounts" || tab === "properties") redirect(`/pilot/management?tab=${tab}`);

  const session = await requireSession("/pilot/account");

  let phone = "";
  let devices: DeviceView[] = [];
  if (usesFakeData()) {
    phone = "+17805551234";
    devices = [{ id: "fake-device", label: "This browser (fake)", lastSeen: "just now", current: true }];
  } else {
    const [account, rows] = await Promise.all([getAccount(session.accountId), listDevices(session.accountId)]);
    phone = account?.phone_e164 ?? "";
    devices = rows.map((d) => ({
      id: d.id,
      label: describeAgent(d.user_agent),
      lastSeen: new Date(d.last_seen_at).toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
      current: d.id === session.deviceId,
    }));
  }

  const roles = [...new Set(session.grants.map((g) => g.role))];
  if (session.isAdmin) roles.push("admin" as never);

  return (
    <PageFrame session={session}>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">My account</h1>
          <p className="text-sm text-muted-foreground">Your details and where you&apos;re signed in</p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex size-11 items-center justify-center rounded-full bg-primary/10">
            <User className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">{session.displayName}</p>
            <p className="text-xs text-muted-foreground">{roleLabel(roles)}</p>
          </div>
          <span className="ml-auto text-sm text-muted-foreground">{formatPhone(phone)}</span>
        </div>

        <AccountPanel phone={phone} devices={devices} />
      </div>
    </PageFrame>
  );
}
