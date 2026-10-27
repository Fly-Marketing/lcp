"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Camera, X, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { reportIssue, updateReport, uploadReportPhoto } from "@/lib/pilot/actions";
import { ISSUE_CATEGORIES, type IssueCategory, type PilotReport } from "@/lib/pilot/types";

export function ReportProblemDialog({
  jobId,
  unitLabel,
  open,
  onOpenChange,
  onSubmitted,
  initialReport,
}: {
  jobId: string;
  unitLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
  initialReport?: PilotReport | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [description, setDescription] = useState(initialReport?.description ?? "");
  const [category, setCategory] = useState<IssueCategory>(
    (initialReport?.category as IssueCategory | undefined) ?? "Other"
  );
  const [urgent, setUrgent] = useState(initialReport?.urgent ?? false);
  const [photos, setPhotos] = useState<{ path: string; previewName: string }[]>(
    (initialReport?.photos ?? []).map((photo, index) => ({
      path: photo.path,
      previewName: `Photo ${index + 1}`,
    }))
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setDescription(initialReport?.description ?? "");
    setCategory((initialReport?.category as IssueCategory | undefined) ?? "Other");
    setUrgent(initialReport?.urgent ?? false);
    setPhotos(
      (initialReport?.photos ?? []).map((photo, index) => ({
        path: photo.path,
        previewName: `Photo ${index + 1}`,
      }))
    );
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.set("photo", file);
    const result = await uploadReportPhoto(jobId, formData);
    setIsUploading(false);

    if (!result.success) {
      toast.error(result.message ?? "Failed to upload photo");
      return;
    }
    setPhotos((prev) => [...prev, { path: result.path, previewName: file.name }]);
  }

  function removePhoto(path: string) {
    setPhotos((prev) => prev.filter((p) => p.path !== path));
  }

  function handleSubmit() {
    if (!description.trim()) return;
    startTransition(async () => {
      const photoPaths = photos.map((photo) => photo.path);
      const result = initialReport
        ? await updateReport(initialReport.id, description, category, urgent, photoPaths)
        : await reportIssue(jobId, description, category, urgent, photoPaths);
      if (!result.success) {
        toast.error(result.message ?? `Failed to ${initialReport ? "update" : "submit"} report`);
        return;
      }
      toast.success(initialReport ? "Report updated" : "Report submitted");
      resetForm();
      onOpenChange(false);
      onSubmitted?.();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetForm();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialReport ? "Edit report" : "Report a problem"}</DialogTitle>
          <DialogDescription>{unitLabel}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as IssueCategory)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ISSUE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>What&apos;s wrong?</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue"
              rows={4}
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="urgent"
              checked={urgent}
              onCheckedChange={(checked) => setUrgent(checked === true)}
            />
            <Label htmlFor="urgent" className="flex cursor-pointer items-center gap-1.5">
              <TriangleAlert className="size-4 text-amber-600" />
              Needs attention before next guest check-in
            </Label>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Photos</Label>
            <div className="flex flex-wrap gap-2">
              {photos.map((photo) => (
                <div
                  key={photo.path}
                  className="relative flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-muted text-xs"
                >
                  <span className="truncate px-1 text-center">{photo.previewName}</span>
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.path)}
                    className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Camera className="size-5" />
                )}
                <span className="text-[10px]">Add</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelected}
            />
          </div>
        </div>

        <DialogFooter>
          <Button disabled={isPending || isUploading || !description.trim()} onClick={handleSubmit}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {initialReport ? "Save report" : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
