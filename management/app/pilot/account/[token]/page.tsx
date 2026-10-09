import { notFound } from "next/navigation";
import { User } from "lucide-react";

import { PilotShell } from "@/components/pilot/pilot-shell";
import { AccountActions } from "@/components/pilot/account-actions";
import { getStaffForToken } from "@/lib/pilot/queries";
import { hashTokenForLookup } from "@/lib/pilot/links";

export const dynamic = "force-dynamic";

function formatPhone(mobile: string | null | undefined): string {
  if (!mobile) return "Not on file";
  const digits = mobile.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return mobile;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default async function PilotAccountPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const staff = await getStaffForToken(hashTokenForLookup(token), token);

  if (!staff) {
    notFound();
  }

  return (
    <PilotShell token={token} staffName={staff.name}>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">My account</h1>
          <p className="text-sm text-muted-foreground">Manage your details and preferences</p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex size-11 items-center justify-center rounded-full bg-primary/10">
            <User className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">{staff.name}</p>
            <p className="text-xs text-muted-foreground">Cleaner</p>
          </div>
          <span className="ml-auto text-sm text-muted-foreground">{formatPhone(staff.mobile)}</span>
        </div>

        <AccountActions staffId={staff.id} />
      </div>
    </PilotShell>
  );
}
