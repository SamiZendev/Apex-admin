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
  source: string;
  is_active: boolean;
}
export interface AccountDetails {
  id: string;
  auth_id?: string;
  redirect_url?: string;
  spend_amount?: string;
  calendar_id?: string;
  contact_email?: string;
  contact_phone?: string;
  name?: string;
  ghl_id?: string;
  ghl_company_id?: string;
  ghl_calendar_id?: string;
  priority_score?: string;
  ghl_location_timezone?: string;
  ghl_custom_field_id?: string;
  assest_minimum?: string;
  condition?: string;
  state?: string;
  calendly_slug?: string;
  calendly_scheduling_url?: string;
  ghl_subaccount_auth?: GHLSubaccountAuth;
}
export interface CalendlyAccountAuth {
  id?: string;
  access_token: string;
  refresh_token: string;
  expires_in: string;
  created_at?: string;
  updated_at?: string;
  calendly_owner?: string;
  calendly_organization?: string;
  source: string;
  is_active: boolean;
  ghl_location_id: string;
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
  ghl_location_id: string;
  calendar_open_hours: OpenHours[];
  calendar_team_members: TeamMembers[];
  ghl_account_details: AccountDetails[];
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

export interface CalendlyWebhookData {
  event: string;
  payload: {
    event: string;
    scheduled_event: {
      end_time: string;
      event_type: string;
      start_time: string;
      status: string;
    };
  };
}

export interface OncehubWebhookData {
  id: string;
  type: string;
  data: {
    id: string;
    status: string;
    starting_time: string;
    owner: string;
    duration_minutes: number;
    contact: string;
    booking_calendar: string;
  };
}

export interface StyleConfig {
  email: string;
  bgColor: string;
  fontSize: number;
}
