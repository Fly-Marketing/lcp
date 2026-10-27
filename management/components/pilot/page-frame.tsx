import { PilotShell } from "@/components/pilot/pilot-shell";
import { navFor } from "@/lib/auth/nav";
import { usesFakeData } from "@/lib/pilot/mode";
import type { Session } from "@/lib/auth/types";

// Server wrapper: builds role-aware navigation from the session.
export function PageFrame({ session, children }: { session: Session; children: React.ReactNode }) {
  return (
    <PilotShell items={navFor(session)} displayName={session.displayName}>
      {usesFakeData() ? (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          FAKE DATA MODE — nothing here touches the real database
        </div>
      ) : null}
      {children}
    </PilotShell>
  );
}
