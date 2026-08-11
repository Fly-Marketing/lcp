import "server-only";

import { listRecords, TABLE_BUNDLES, TABLE_JOBS, TABLE_STAFF, TABLE_UNITS } from "@/lib/airtable/client";
import { mapBundleRecord, mapJobRecord, mapStaffRecord, mapUnitRecord } from "@/lib/airtable/mappers";
import type { BundlesFields, JobsFields, StaffFields, UnitsFields } from "@/lib/airtable/schema";
import { getSessionStaffId } from "@/lib/session";
import type { CleaningJob, CleaningRoute, Employee, Unit } from "@/lib/types";

async function fetchUnitsByUnitId() {
  const units = await listRecords<UnitsFields>(TABLE_UNITS());
  const byUnitId = new Map<string, (typeof units)[number]>();
  for (const unit of units) {
    if (unit.fields["Unit ID"]) byUnitId.set(unit.fields["Unit ID"], unit);
  }
  return byUnitId;
}

export async function getAllJobs(): Promise<CleaningJob[]> {
  const [jobs, unitsByUnitId, employee] = await Promise.all([
    listRecords<JobsFields>(TABLE_JOBS()),
    fetchUnitsByUnitId(),
    getCurrentEmployee(),
  ]);
  const hourlyRate = employee?.hourlyRate ?? 0;

  return jobs.map((job) =>
    mapJobRecord(job, unitsByUnitId.get(job.fields["Unit ID"] ?? ""), hourlyRate)
  );
}

export async function getJobById(jobId: string): Promise<CleaningJob | undefined> {
  const jobs = await getAllJobs();
  return jobs.find((job) => job.id === jobId);
}

export async function getAllRoutes(): Promise<CleaningRoute[]> {
  const [bundles, jobs] = await Promise.all([
    listRecords<BundlesFields>(TABLE_BUNDLES()),
    getAllJobs(),
  ]);

  const jobsByBundleKey = new Map<string, CleaningJob[]>();
  for (const job of jobs) {
    if (!job.routeId) continue;
    const list = jobsByBundleKey.get(job.routeId) ?? [];
    list.push(job);
    jobsByBundleKey.set(job.routeId, list);
  }

  return bundles
    .map((bundle) => {
      const bundleJobs = jobsByBundleKey.get(bundle.fields["Bundle Key"] ?? "") ?? [];
      return mapBundleRecord(bundle, bundleJobs);
    })
    .filter((route) => route.jobIds.length > 0);
}

export async function getRouteById(routeId: string): Promise<CleaningRoute | undefined> {
  const routes = await getAllRoutes();
  return routes.find((route) => route.id === routeId);
}

export async function getJobsForRoute(routeId: string): Promise<CleaningJob[]> {
  const route = await getRouteById(routeId);
  if (!route) return [];
  const jobs = await getAllJobs();
  return jobs.filter((job) => route.jobIds.includes(job.id));
}

export async function getAllUnits(): Promise<Unit[]> {
  const units = await listRecords<UnitsFields>(TABLE_UNITS(), {
    sort: [{ field: "Unit Name" }],
  });
  return units.map(mapUnitRecord);
}

export async function getCurrentEmployee(): Promise<Employee | undefined> {
  const staffRecordId = await getSessionStaffId();
  if (!staffRecordId) return undefined;

  const [record] = await listRecords<StaffFields>(TABLE_STAFF(), {
    filterByFormula: `RECORD_ID() = "${staffRecordId}"`,
  });
  return record?.fields.Active ? mapStaffRecord(record) : undefined;
}
