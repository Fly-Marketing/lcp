import { MockStoreProvider } from "@/lib/mock-store";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import type { CleaningJob, CleaningRoute, Employee } from "@/lib/types";

export function AppShell({
  children,
  employee,
  jobs,
  routes,
}: {
  children: React.ReactNode;
  employee: Employee;
  jobs: CleaningJob[];
  routes: CleaningRoute[];
}) {
  return (
    <MockStoreProvider employee={employee} jobs={jobs} routes={routes}>
      <div className="flex min-h-full w-full flex-1 md:items-start">
        <SidebarNav />
        <div className="flex min-h-full w-full flex-1 flex-col bg-background md:min-h-dvh">
          <div className="flex-1 px-4 pb-6 pt-6 md:px-10 md:pt-10 md:pb-10">
            <div className="mx-auto w-full max-w-[520px] md:max-w-none">
              {children}
            </div>
          </div>
          <BottomNav />
        </div>
      </div>
    </MockStoreProvider>
  );
}
