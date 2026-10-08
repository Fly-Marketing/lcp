export interface PilotJob {
  id: string;
  unitLabel: string;
  propertyName: string;
  address: string;
  checkoutDate: string | null;
  checkoutTime: string | null;
  nextCheckInDate: string | null;
  expectedHours: number;
  status: string;
}
