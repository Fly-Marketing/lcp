import { redirect } from "next/navigation";

import { PageFrame } from "@/components/pilot/page-frame";
import { AdminPanel } from "@/components/pilot/admin-panel";
import { loadAdminData } from "@/lib/auth/admin";
import { requireSession } from "@/lib/auth/session";
import { usesFakeData } from "@/lib/pilot/mode";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireSession("/pilot/admin");
  if (!session.isAdmin) redirect("/pilot/start");

  return (
    <PageFrame session={session}>
      <div className="mx-auto w-full max-w-3xl">
        {usesFakeData() ? (
          <p className="text-sm text-muted-foreground">The admin tools need the real database (PILOT_USE_FAKE_DATA=false).</p>
        ) : (
          <AdminPanel data={await loadAdminData()} />
        )}
      </div>
    </PageFrame>
  );
}
