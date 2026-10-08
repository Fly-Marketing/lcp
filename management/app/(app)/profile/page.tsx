"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/layout/page-header";
import { PreferencePills } from "@/components/profile/preference-pills";
import { logout } from "@/lib/airtable/actions";
import { useMockStore } from "@/lib/mock-store";
import type { DayOfWeek } from "@/lib/types";

const DAYS: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const AREAS = ["Edmonton", "St. Albert", "Spruce Grove", "Stony Plain"];

export default function ProfilePage() {
  const router = useRouter();
  const { employee, updateEmployeePreferences } = useMockStore();

  function toggleDay(day: string) {
    const set = new Set(employee.preferredDays);
    if (set.has(day as DayOfWeek)) {
      set.delete(day as DayOfWeek);
    } else {
      set.add(day as DayOfWeek);
    }
    updateEmployeePreferences({ preferredDays: Array.from(set) });
  }

  function toggleArea(area: string) {
    const set = new Set(employee.preferredAreas);
    if (set.has(area)) {
      set.delete(area);
    } else {
      set.add(area);
    }
    updateEmployeePreferences({ preferredAreas: Array.from(set) });
  }

  const initials = employee.name
    .split(" ")
    .map((part) => part[0])
    .join("");

  return (
    <div>
      <PageHeader title="Profile" subtitle="Availability and alerts" />

      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <Avatar size="lg">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-foreground">{employee.name}</p>
          <p className="text-sm text-muted-foreground">{employee.email}</p>
        </div>
      </div>

      <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3 p-4">
          <div>
            <Label htmlFor="taking-new-work" className="font-medium text-foreground">
              Taking New Work
            </Label>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Turn off to stop receiving new job offers
            </p>
          </div>
          <Switch
            id="taking-new-work"
            checked={employee.takingNewWork}
            onCheckedChange={(checked) =>
              updateEmployeePreferences({ takingNewWork: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between gap-3 p-4">
          <div>
            <Label htmlFor="job-alerts" className="font-medium text-foreground">
              New Job Alerts
            </Label>
            <p className="mt-0.5 text-sm text-muted-foreground">
              SMS notifications
            </p>
          </div>
          <Switch
            id="job-alerts"
            checked={employee.newJobAlerts}
            onCheckedChange={(checked) =>
              updateEmployeePreferences({ newJobAlerts: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="font-medium text-foreground">Push Notifications</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Coming soon</p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Soon
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 p-4">
          <div>
            <Label htmlFor="show-prices" className="font-medium text-foreground">
              Show Prices
            </Label>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Turn off to hide pay amounts throughout the app
            </p>
          </div>
          <Switch
            id="show-prices"
            checked={employee.showPrices}
            onCheckedChange={(checked) =>
              updateEmployeePreferences({ showPrices: checked })
            }
          />
        </div>
      </div>

      <h2 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Preferred Days
      </h2>
      <PreferencePills
        options={DAYS}
        selected={employee.preferredDays}
        onToggle={toggleDay}
      />

      <h2 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Preferred Areas
      </h2>
      <PreferencePills
        options={AREAS}
        selected={employee.preferredAreas}
        onToggle={toggleArea}
      />

      <button
        type="button"
        onClick={async () => {
          await logout();
          router.push("/login");
        }}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3.5 text-sm font-medium text-foreground"
      >
        <LogOut className="size-4" />
        Log out
      </button>
    </div>
  );
}
