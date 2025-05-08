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
  title?: string;
  meetingLocationType?: string;
  appointmentStatus?: string;
  assignedUserId?: string;
  address?: string;
  ignoreDateRange?: boolean;
  toNotify?: boolean;
  ignoreFreeSlotValidation?: boolean;
  rrule?: string;
  id?: string;
}

export interface OpenHours {
  day_of_the_week: number;
  open_hour: number;
  open_minute: number;
  close_hour: number;
  close_minute: number;
}
export interface TeamMembers {
  user_id: string;
  ghl_calendar_id: string;
  calendar_id: string;
  priority: Number;
  is_primary: boolean;
}

export interface BookedSlots {
  ghl_assigned_user_id: string;
  ghl_location_id: string;
  start_time: number;
  end_time: number;
  ghl_calendar_id: string;
}
export interface Calendar {
  id: string;
  name: string;
  calendar_open_hours: OpenHours[];
  calendar_team_members: TeamMembers[];
}

export interface ContactData {
  firstName: string;
  lastName?: string;
  email: string;
  locationId: string;
  phone?: string;
  source?: string;
  customFields?: [
    {
      [key: string]: string | number | boolean;
    }
  ];
}

export interface AppointmentWebhookData {
  type: string;
  locationId: string;
  appointment: AppointmentData;
}
