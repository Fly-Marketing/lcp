/** Field-name contracts for the LCP - Airbnb base. Keep in sync with Airtable if fields are renamed. */

export interface UnitsFields {
  "Unit ID": string;
  "Unit Name"?: string;
  "Property / Building"?: string;
  Client?: string;
  Address?: string;
  Area?: string;
  Active?: boolean;
  "Room State"?: string;
  "Cleaning Status"?: string;
  "Current Stay Checkout"?: string;
  "Next Check-in"?: string;
  "Last Clean"?: string;
  "Last Completed Job ID"?: string;
  "Assigned Cleaner"?: string;
  "Expected Hours"?: number;
  "Cleaner Pay"?: number;
  "Checkout Time"?: string;
  "Check-in Time"?: string;
  "Access Instructions"?: string;
  "Important Notes"?: string;
  "Special Requirements"?: string;
}

export interface JobsFields {
  "Unit Name"?: string;
  "Job ID"?: number;
  "Job Key"?: string;
  "Unit ID"?: string;
  Client?: string;
  "Property / Building"?: string;
  Address?: string;
  Area?: string;
  "Checkout Date"?: string;
  "Checkout Time"?: string;
  "Next Check-in Date"?: string;
  "Check-in Time"?: string;
  "Earliest Clean Date"?: string;
  "Latest Clean Date"?: string;
  "Expected Hours"?: number;
  "Cleaner Pay"?: number;
  "Turnover Type"?: string;
  Priority?: string;
  Status?: string;
  "Bundle ID"?: string;
  "Assigned Staff ID"?: string;
  "Assigned Cleaner"?: string;
  Source?: string;
  "Claimed At"?: string;
  "Completed At"?: string;
  "Cancelled At"?: string;
  Notes?: string;
}

export interface BundlesFields {
  "Bundle ID"?: number;
  "Bundle Key"?: string;
  Area?: string;
  "Property / Building"?: string;
  "Scheduled Date"?: string;
  "Units Count"?: number;
  "Expected Hours"?: number;
  "Total Cleaner Pay"?: number;
  "Assigned Staff ID"?: string;
  "Assigned Cleaner"?: string;
  Status?: string;
  "Published At"?: string;
  "Claimed At"?: string;
  Notes?: string;
}

export interface ReportsFields {
  Description?: string;
  Category?: string;
  "Job ID"?: string;
  "Staff ID"?: string;
  Status?: string;
}

/** Write-side shape for Jobs: select fields accept plain strings, per Airtable API convention. */
export interface JobsWriteFields {
  Status?: "Claimed" | "In Progress" | "Completed" | "Cancelled" | "Exception";
  "Claimed At"?: string;
  "Completed At"?: string;
  "Cancelled At"?: string;
  "Assigned Staff ID"?: string;
  "Assigned Cleaner"?: string;
  Notes?: string;
}

/** Write-side shape for Reports. */
export interface ReportsWriteFields {
  Description: string;
  Category: string;
  "Job ID"?: string;
  "Staff ID"?: string;
  Status: "New" | "Acknowledged" | "Resolved";
}

/** Write-side shape for Bundles. */
export interface BundlesWriteFields {
  "Claimed At"?: string;
  "Assigned Staff ID"?: string;
  "Assigned Cleaner"?: string;
}

export interface StaffFields {
  "Staff ID": string;
  Name?: string;
  Mobile?: string;
  PIN?: string;
  Email?: string;
  "Outlook Email"?: string;
  "Service Areas"?: string;
  "Maximum Daily Hours"?: number;
  "Hourly Rate"?: number;
  "Show Prices"?: boolean;
  "Airbnb Qualified"?: boolean;
  Active?: boolean;
  "Completed Units"?: number;
  Notes?: string;
}
