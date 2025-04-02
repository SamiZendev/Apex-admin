export interface GHLSubaccountAuth {
  id?: string;
  ghl_location_id: string;
  access_token: string;
  refresh_token: string;
  expires_in: string;
  created_at?: string;
  updated_at?: string;
  ghl_company_id: string;
  account_type: string;
  is_active: boolean;
}

export interface RefreshAuthResponse {
  success: boolean;
  data?: GHLSubaccountAuth[];
  message?: string;
  error?: object;
}

export interface AppointmentData {
  calendarId: string;
  locationId: string;
  contactId: string;
  startTime: string;
  endTime: string;
  title: string;
  meetingLocationType: string;
  appointmentStatus: string;
  assignedUserId: string;
  address: string;
  ignoreDateRange: boolean;
  toNotify: boolean;
  ignoreFreeSlotValidation: boolean;
  rrule: string;
}
