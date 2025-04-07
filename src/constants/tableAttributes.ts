export const GHL_SUBACCOUNT_AUTH_ATTRIBUTES = {
  GHL_LOCATION_ID: "ghl_location_id",
  GHL_COMPANY_ID: "ghl_company_id",
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  EXPIRES_IN: "expires_in",
  ACCOUNT_TYPE: "account_type",
  IS_ACTIVE: "is_active",
  UPDATED_AT: "updated_at",
} as const;

export const GHL_ACCOUNT_DETAILS = {
  AUTH_ID: "auth_id",
  SPEND_AMOUNT: "spend_amount",
  CALENDAR_ID: "calendar_id",
  PHONE: "contact_phone",
  NAME: "name",
  EMAIL: "contact_email",
  REDIRECT_URL: "redirect_url",
  GHL_ID: "ghl_id",
  PRIORITY_SCORE: "priority_score",
  GHL_COMPANY_ID: "ghl_company_id",
  GHL_CALENDAR_ID: "ghl_calendar_id",
  GHL_LOCATION_TIMEZONE: "ghl_location_timezone",
} as const;

export const CALENDAR_DATA = {
  ID: "id",
  NAME: "name",
  BOOKED_SLOTS: "booked_slots",
  CALENDAR_ID: "calendar_id",
  SLOT_INTERVAL: "slot_interval",
  SLOT_DURATION: "slot_duration",
  PRE_BUFFER_TIME: "pre_buffer_time",
  IS_ACTIVE: "is_active",
  GROUP_ID: "group_id",
  SLUG: "slug",
  APPOINTMENTS_PER_SLOT: "appointments_per_slot",
  APPOINTMENTS_PER_DAY: "appointments_per_day",
  ALLOW_BOOKING_AFTER_DAY: "allow_booking_after_day",
  ALLOW_CANCELLATION: "allow_cancellation",
  ALLOW_RESCHEDULE: "allow_reschedule",
  ALLOW_BOOKING_FOR_DAYS: "allow_booking_for_days",
  GHL_LOCATION_ID: "ghl_location_id",
} as const;

export const CALENDAR_OPEN_HOURS = {
  ID: "id",
  CALENDAR_ID: "calendar_id",
  DAY_OF_THE_WEEK: "day_of_the_week",
  OPEN_HOUR: "open_hour",
  OPEN_MINUTE: "open_minute",
  CLOSE_HOUR: "close_hour",
  CLOSE_MINUTE: "close_minute",
  GHL_CALENDAR_ID: "ghl_calendar_id",
} as const;

export const CALENDAR_TEAM_MEMBERS = {
  ID: "id",
  CALENDAR_ID: "calendar_id",
  USER_ID: "user_id",
  PRIORITY: "priority",
  IS_PRIMARY: "is_primary",
  GHL_CALENDAR_ID: "ghl_calendar_id",
} as const;

export const CALENDAR_BOOKED_SLOTS = {
  ID: "id",
  APPOINTMNET_STATUS: "appointment_status",
  GHL_EVENT_ID: "ghl_event_id",
  GHL_LOCATION_ID: "ghl_location_id",
  GHL_ASSIGNED_USER_ID: "ghl_assigned_user_id",
  GHL_CALENDAR_ID: "ghl_calendar_id",
  START_TIME: "start_time",
  END_TIME: "end_time",
  GHL_CONTACT_ID: "ghl_contact_id",
} as const;

export const USER_DATA = {
  ID: "id",
  NAME: "name",
  EMAIL: "email",
  PASSWORD: "password",
  GHL_COMPANY_ID: "ghl_company_id",
} as const;
