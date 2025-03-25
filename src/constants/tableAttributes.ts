export const GHL_SUBACCOUNT_AUTH_ATTRIBUTES = {
  GHL_LOCATION_ID: "ghl_location_id",
  GHL_COMPANY_ID: "ghl_company_id",
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  EXPIRES_IN: "expires_in",
  ACCOUNT_TYPE: "account_type",
  IS_ACTIVE: "isActive",
} as const;

export const GHL_ACCOUNT_DETAILS = {
  AUTH_ID: "auth_id",
  SPEND_AMOUNT: "spend_amount",
  CALENDAR_ID: "calendar_id",
  PHONE: "contact_phone",
  NAME: "name",
  EMAIL: "contact_email",
  REDIRECT_URL: "redirect_url",
} as const;
