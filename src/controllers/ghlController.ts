import { isTokenExpired } from "../utils/helpers";
import { GHL_SUBACCOUNT_AUTH_ATTRIBUTES } from "../constants/tableAttributes";
import { matchByString, supabase } from "../services/supabaseClient";
import {
  GHL_SUBACCOUNT_AUTH_ACCOUNT_TYPE,
  SUPABASE_TABLE_NAME,
} from "../utils/constant";
import axios from "axios";
import { refreshAuth } from "./authController";

export const fetchAllCalendarsByLocationId = async (locationId: string) => {
  try {
    if (!locationId) {
      return { success: false, error: "Missing locationId in body" };
    }

    const subaccount = await matchByString(
      SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE,
      GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_LOCATION_ID,
      locationId
    );

    if (Array.isArray(subaccount) && subaccount.length > 0) {
      let access_token = subaccount[0]?.access_token;

      if (
        isTokenExpired(
          subaccount[0]?.updated_at,
          subaccount[0]?.[GHL_SUBACCOUNT_AUTH_ATTRIBUTES.EXPIRES_IN]
        )
      ) {
        const refreshTokenResponse = await refreshAuth(
          locationId,
          subaccount[0]?.[GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ACCOUNT_TYPE]
        );

        if (refreshTokenResponse.success && refreshTokenResponse.data?.length) {
          access_token = refreshTokenResponse.data[0].access_token;
        }
      }

      const response = await axios.get(
        `${process.env.GHL_API_BASE_URL}/calendars/`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${access_token}`,
            Version: process.env.GHL_API_VERSION,
          },
          params: { locationId },
        }
      );
      return response.data;
    }

    return { success: false, message: "Subaccount Not Found" };
  } catch (error: any) {
    console.error(
      "Error fetching calendars:",
      error?.response?.data || error.message
    );
    return {
      error: "Failed to fetch calendars",
      details: error?.response?.data || error.message,
    };
  }
};

export const fetchCompanyInformation = async (companyId: string) => {
  try {
    if (!companyId) {
      return { success: false, error: "Missing companyId in body" };
    }
    const { data, error } = await supabase
      .from(SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE)
      .select("*")
      .eq(GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_COMPANY_ID, companyId)
      .eq(
        GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ACCOUNT_TYPE,
        GHL_SUBACCOUNT_AUTH_ACCOUNT_TYPE.COMPANY
      );

    let access_token = "";

    if (!error) {
      access_token = data[0]?.access_token;

      if (
        isTokenExpired(
          data[0]?.updated_at,
          data[0]?.[GHL_SUBACCOUNT_AUTH_ATTRIBUTES.EXPIRES_IN]
        )
      ) {
        const refreshTokenResponse = await refreshAuth(
          companyId,
          data[0]?.[GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ACCOUNT_TYPE]
        );

        if (refreshTokenResponse.success && refreshTokenResponse.data?.length) {
          access_token = refreshTokenResponse.data[0].access_token;
        }
      }
    }
    console.log("access_token", access_token);
    const response = await axios.get(
      `${process.env.GHL_API_BASE_URL}/companies/${companyId}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${access_token}`,
          Version: process.env.GHL_API_VERSION,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error(
      "Error fetching company details:",
      error?.response?.data || error.message
    );
    return {
      error: "Failed to fetch company details",
      details: error?.response?.data || error.message,
    };
  }
};

export const fetchSubaccountInformation = async (locationId: string) => {
  try {
    if (!locationId) {
      return { success: false, error: "Missing locationId in body" };
    }
    const existingLocation = await matchByString(
      SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE,
      GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_LOCATION_ID,
      locationId
    );

    if (
      Array.isArray(existingLocation) &&
      Object.keys(existingLocation).length > 0
    ) {
      let access_token = existingLocation[0]?.access_token;

      if (
        isTokenExpired(
          existingLocation[0]?.updated_at,
          existingLocation[0]?.[GHL_SUBACCOUNT_AUTH_ATTRIBUTES.EXPIRES_IN]
        )
      ) {
        const refreshTokenResponse = await refreshAuth(
          locationId,
          existingLocation[0]?.[GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ACCOUNT_TYPE]
        );

        if (refreshTokenResponse.success && refreshTokenResponse.data?.length) {
          access_token = refreshTokenResponse.data[0].access_token;
        }
      }

      const response = await axios.get(
        `${process.env.GHL_API_BASE_URL}/locations/${locationId}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${access_token}`,
            Version: process.env.GHL_API_VERSION,
          },
        }
      );
      return response.data;
    }

    return { success: false, error: "Location Not Found" };
  } catch (error: any) {
    console.error(
      "Error fetching subaccount details:",
      error?.response?.data || error.message
    );
    return {
      error: "Failed to fetch subaccount details",
      details: error?.response?.data || error.message,
    };
  }
};
