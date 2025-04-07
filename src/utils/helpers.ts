import { matchByString } from "../services/supabaseClient";
import crypto from "crypto";
import { SUPABASE_TABLE_NAME } from "./constant";
import { GHL_SUBACCOUNT_AUTH_ATTRIBUTES } from "../constants/tableAttributes";
import { refreshAuth } from "../controllers/authController";

export const isTokenExpired = (issued_at: string, expires_in: string) => {
  const currentTime = Math.floor(Date.now() / 1000);
  return (
    currentTime >=
    Math.floor(new Date(issued_at).getTime() / 1000) + Number(expires_in)
  );
};

export const formatTimestamp = (date: Date): string => {
  const pad = (num: number, size: number): string =>
    String(num).padStart(size, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1, 2);
  const day = pad(date.getDate(), 2);
  const hours = pad(date.getHours(), 2);
  const minutes = pad(date.getMinutes(), 2);
  const seconds = pad(date.getSeconds(), 2);
  const milliseconds = pad(date.getMilliseconds(), 6); // Pad to 6 digits

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
};

export function convertToSeconds(
  value: number,
  unit: "months" | "weeks" | "days" | "hours" | "mins"
): number {
  if (value <= 0) return 0;

  const conversionRates: Record<
    "months" | "weeks" | "days" | "hours" | "mins",
    number
  > = {
    months: 30 * 24 * 3600,
    weeks: 7 * 24 * 3600,
    days: 24 * 3600,
    hours: 3600,
    mins: 60,
  };
  console.log(
    `Value: ${value}, Unit: ${unit}, Conversion: ${
      value * conversionRates[unit]
    }`
  );
  return Math.floor(value * conversionRates[unit]);
}

export const generateRandomPassword = (length: number = 12): string => {
  return crypto.randomBytes(length).toString("base64").slice(0, length);
};

export const retrieveAccessToken = async (ghl_id: string) => {
  try {
    const existingLocation = await matchByString(
      SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE,
      GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_LOCATION_ID,
      ghl_id
    );
    if (
      Array.isArray(existingLocation) &&
      Object.keys(existingLocation).length > 0
    ) {
      if (
        isTokenExpired(
          existingLocation[0]?.updated_at,
          existingLocation[0]?.[GHL_SUBACCOUNT_AUTH_ATTRIBUTES.EXPIRES_IN]
        )
      ) {
        const refreshTokenResponse = await refreshAuth(
          ghl_id,
          existingLocation[0]?.[GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ACCOUNT_TYPE]
        );

        if (refreshTokenResponse.success && refreshTokenResponse.data?.length) {
          return refreshTokenResponse.data[0].access_token;
        }
      }

      return existingLocation[0]?.access_token;
    }
  } catch (error) {
    console.log("Error retrieving access token");
  }
};
