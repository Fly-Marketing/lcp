"use server";

import { getServiceClient } from "@/lib/pilot/supabase";
import { usesFakeData } from "@/lib/pilot/mode";
import { fakeAcceptJob, fakeCompleteJob, fakeReportIssue } from "@/lib/pilot/fake-store";
import type { IssueCategory } from "@/lib/pilot/types";

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

export async function reportIssue(
  jobId: string,
  staffId: string,
  description: string,
  category: IssueCategory,
  urgent: boolean,
  photoUrls: string[]
) {
  if (usesFakeData()) {
    return fakeReportIssue(jobId, description, category, urgent, photoUrls);
  }

  const supabase = getServiceClient();
  const { error } = await supabase.from("reports").insert({
    job_id: jobId,
    staff_id: staffId,
    description,
    category,
    urgent,
    photo_urls: photoUrls.length > 0 ? photoUrls : null,
  });

  if (error) return { success: false, message: error.message };
  return { success: true };
}

const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function uploadReportPhoto(jobId: string, formData: FormData) {
  const file = formData.get("photo");
  if (!(file instanceof File)) {
    return { success: false as const, message: "No file provided" };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { success: false as const, message: "Photo is too large (max 8MB)" };
  }
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return { success: false as const, message: "Unsupported photo type" };
  }

  if (usesFakeData()) {
    // Fake mode: no real upload, just echo a placeholder URL so the UI flow works end-to-end.
    return { success: true as const, url: `https://example.com/fake-photo-${Date.now()}.jpg` };
  }

  const supabase = getServiceClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${jobId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from("report-photos").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) return { success: false as const, message: error.message };

  const { data } = supabase.storage.from("report-photos").getPublicUrl(path);
  return { success: true as const, url: data.publicUrl };
}
