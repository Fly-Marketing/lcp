"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  claimJob as claimJobAction,
  claimRoute as claimRouteAction,
  completeClean as completeCleanAction,
  startClean as startCleanAction,
  submitReport as submitReportAction,
  type SubmitReportInput,
} from "@/lib/airtable/actions";
import type {
  CleaningJob,
  CleaningRoute,
  Employee,
  IssueReport,
} from "@/lib/types";

interface MockStoreValue {
  employee: Employee;
  jobs: CleaningJob[];
  routes: CleaningRoute[];
  reports: IssueReport[];
  getJob: (id: string) => CleaningJob | undefined;
  getRoute: (id: string) => CleaningRoute | undefined;
  jobsForRoute: (routeId: string) => CleaningJob[];
  claimJob: (jobId: string) => Promise<{ success: boolean; message?: string }>;
  claimRoute: (
    routeId: string
  ) => Promise<{ success: boolean; message?: string }>;
  startClean: (jobId: string) => Promise<void>;
  completeClean: (jobId: string, note?: string) => Promise<void>;
  submitReport: (input: SubmitReportInput) => Promise<void>;
  updateEmployeePreferences: (patch: Partial<Employee>) => void;
}

const MockStoreContext = createContext<MockStoreValue | null>(null);

export function MockStoreProvider({
  children,
  employee: initialEmployee,
  jobs: initialJobs,
  routes: initialRoutes,
}: {
  children: React.ReactNode;
  employee: Employee;
  jobs: CleaningJob[];
  routes: CleaningRoute[];
}) {
  const router = useRouter();
  const [employeeState, setEmployeeState] = useState<Employee>(initialEmployee);
  const [jobs, setJobs] = useState<CleaningJob[]>(initialJobs);
  const [routes, setRoutes] = useState<CleaningRoute[]>(initialRoutes);
  const [reports, setReports] = useState<IssueReport[]>([]);

  const getJob = useCallback(
    (id: string) => jobs.find((job) => job.id === id),
    [jobs]
  );
  const getRoute = useCallback(
    (id: string) => routes.find((route) => route.id === id),
    [routes]
  );
  const jobsForRoute = useCallback(
    (routeId: string) =>
      jobs
        .filter((job) => job.routeId === routeId)
        .sort((a, b) => (a.positionInRoute ?? 0) - (b.positionInRoute ?? 0)),
    [jobs]
  );

  const claimJob = useCallback(
    async (jobId: string) => {
      const result = await claimJobAction(jobId);
      if (!result.success) {
        toast.error(result.message ?? "Unable to claim this job.");
        return { success: false, message: result.message };
      }
      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId ? { ...job, status: "claimed" } : job
        )
      );
      toast.success("Job claimed");
      router.refresh();
      return { success: true };
    },
    [router]
  );

  const claimRoute = useCallback(
    async (routeId: string) => {
      const result = await claimRouteAction(routeId);
      if (!result.success) {
        toast.error(result.message ?? "Unable to claim this route.");
        return { success: false, message: result.message };
      }
      setRoutes((prev) =>
        prev.map((route) =>
          route.id === routeId ? { ...route, status: "claimed" } : route
        )
      );
      toast.success("Route claimed");
      router.refresh();
      return { success: true };
    },
    [router]
  );

  const startClean = useCallback(
    async (jobId: string) => {
      await startCleanAction(jobId);
      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId ? { ...job, status: "in_progress" } : job
        )
      );
      router.refresh();
    },
    [router]
  );

  const completeClean = useCallback(
    async (jobId: string, note?: string) => {
      await completeCleanAction(jobId, note);
      const now = new Date();
      const completedAt = now.toLocaleTimeString("en-CA", {
        hour: "numeric",
        minute: "2-digit",
      });
      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId
            ? { ...job, status: "completed", completedAt, completionNote: note }
            : job
        )
      );

      const job = jobs.find((j) => j.id === jobId);
      if (job?.routeId) {
        const siblingJobs = jobs.filter((j) => j.routeId === job.routeId);
        const allDone = siblingJobs.every((j) =>
          j.id === jobId ? true : j.status === "completed"
        );
        setRoutes((prev) =>
          prev.map((route) =>
            route.id === job.routeId
              ? { ...route, status: allDone ? "completed" : "in_progress", completedAt: allDone ? completedAt : route.completedAt }
              : route
          )
        );
      }
      router.refresh();
    },
    [jobs, router]
  );

  const submitReport = useCallback(
    async (input: SubmitReportInput) => {
      await submitReportAction(input);
      const job = jobs.find((j) => j.id === input.jobId);
      setReports((prev) => [
        {
          id: `report-${Date.now()}`,
          category: input.category,
          description: input.description,
          employeeName: employeeState.name,
          jobId: input.jobId,
          routeId: job?.routeId,
          unitLabel: job?.unitLabel,
          createdAt: "now",
          awaitingFollowUp: true,
        },
        ...prev,
      ]);
    },
    [jobs, employeeState.name]
  );

  const updateEmployeePreferences = useCallback((patch: Partial<Employee>) => {
    setEmployeeState((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo<MockStoreValue>(
    () => ({
      employee: employeeState,
      jobs,
      routes,
      reports,
      getJob,
      getRoute,
      jobsForRoute,
      claimJob,
      claimRoute,
      startClean,
      completeClean,
      submitReport,
      updateEmployeePreferences,
    }),
    [
      employeeState,
      jobs,
      routes,
      reports,
      getJob,
      getRoute,
      jobsForRoute,
      claimJob,
      claimRoute,
      startClean,
      completeClean,
      submitReport,
      updateEmployeePreferences,
    ]
  );

  return (
    <MockStoreContext.Provider value={value}>
      {children}
    </MockStoreContext.Provider>
  );
}

export function useMockStore() {
  const ctx = useContext(MockStoreContext);
  if (!ctx) {
    throw new Error("useMockStore must be used within a MockStoreProvider");
  }
  return ctx;
}
