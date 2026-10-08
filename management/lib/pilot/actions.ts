"use server";

import { getServiceClient } from "@/lib/pilot/supabase";

export async function acceptJob(jobId: string) {
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("jobs")
    .update({ status: "Claimed", claimed_at: new Date().toISOString() })
    .eq("id", jobId);

  if (error) return { success: false, message: error.message };
  return { success: true };
}

export async function completeJob(jobId: string) {
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("jobs")
    .update({ status: "Completed", completed_at: new Date().toISOString() })
    .eq("id", jobId);

  if (error) return { success: false, message: error.message };
  return { success: true };
}

export async function reportIssue(jobId: string, staffId: string, description: string) {
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
