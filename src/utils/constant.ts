export const SUPABASE_TABLE_NAME = {
  GHL_SUBACCOUNT_AUTH_TABLE: "ghl_subaccount_auth",
  GHL_ACCOUNT_DETAILS: "ghl_account_details",
  CALENDAR_DATA: "calendar_data",
  CALENDAR_OPEN_HOURS: "calendar_open_hours",
  CALENDAR_TEAM_MEMBERS: "calendar_team_members",
  CALENDAR_BOOKED_SLOTS: "calendar_booked_slots",
  USERS: "users",
  TIMEZONE: "timezone",
} as const;

export const GHL_SUBACCOUNT_AUTH_ACCOUNT_TYPE = {
  LOCATION: "location",
  COMPANY: "company",
} as const;
