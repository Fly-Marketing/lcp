export type Role = "owner" | "manager" | "cleaner";
export type ManagementMode = "lcp" | "self";

export interface Grant {
  role: Role;
  buildingId: string;
  managementMode: ManagementMode;
  canEditPrice: boolean;
  isPrimary: boolean;
}

export interface Session {
  accountId: string;
  displayName: string;
  staffId: string | null;
  customerId: string | null;
  isAdmin: boolean;
  grants: Grant[];
  deviceId: string | null;
}
