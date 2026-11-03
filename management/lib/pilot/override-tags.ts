// Why a manager overrode a job. Every Mark done or Archive needs one, so the record reads without the comment.
export const OVERRIDE_TAGS = {
  markDone: [
    { value: "cleaned_outside_app", label: "Cleaned outside the app" },
    { value: "cleaner_forgot_to_log", label: "Cleaner forgot to mark it done" },
    { value: "owner_confirmed", label: "Owner confirmed it was cleaned" },
    { value: "other", label: "Other" },
  ],
  archive: [
    { value: "guest_cancelled", label: "Guest cancelled" },
    { value: "duplicate", label: "Duplicate booking" },
    { value: "booking_moved", label: "Booking moved or changed" },
    { value: "property_unavailable", label: "Property unavailable" },
    { value: "other", label: "Other" },
  ],
  reschedule: [
    { value: "guest_changed_dates", label: "Guest changed dates" },
    { value: "cleaner_unavailable", label: "Cleaner unavailable" },
    { value: "owner_requested", label: "Owner requested" },
    { value: "other", label: "Other" },
  ],
} as const;

export type OverrideAction = keyof typeof OVERRIDE_TAGS;

export function isOverrideTag(action: OverrideAction, tag: string | null | undefined): boolean {
  return !!tag && (OVERRIDE_TAGS[action] as readonly { value: string }[]).some((t) => t.value === tag);
}
