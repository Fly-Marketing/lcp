"use server";

import { getServiceClient } from "@/lib/pilot/supabase";
import { usesFakeData } from "@/lib/pilot/mode";
import { fakeAcceptJob, fakeCompleteJob, fakeReportIssue } from "@/lib/pilot/fake-store";

export async function acceptJob(jobId: string) {
  if (usesFakeData()) {
    return fakeAcceptJob(jobId);
  }

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("jobs")
    .update({ status: "Claimed", claimed_at: new Date().toISOString() })
    .eq("id", jobId);

  if (error) return { success: false, message: error.message };
  return { success: true };
}

export async function completeJob(jobId: string) {
  if (usesFakeData()) {
    return fakeCompleteJob(jobId);
  }

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("jobs")
    .update({ status: "Completed", completed_at: new Date().toISOString() })
    .eq("id", jobId);

  if (error) return { success: false, message: error.message };
  return { success: true };
}

export async function reportIssue(jobId: string, staffId: string, description: string) {
  if (usesFakeData()) {
    return fakeReportIssue(jobId, description);
  }

  const supabase = getServiceClient();
  const { error } = await supabase.from("reports").insert({
    job_id: jobId,
    staff_id: staffId,
    description,
    category: "Other",
  });

  if (error) return { success: false, message: error.message };
  return { success: true };
}
