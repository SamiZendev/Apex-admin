import axios from "axios";
import qs from "qs";
import { Request, Response } from "express";
import {
  insertData,
  matchByString,
  supabase,
  updateData,
} from "../services/supabaseClient";
import { IGHLSubaccountAuth } from "@/types/IGhlSubaccountAuth";
import {
  GHL_SUBACCOUNT_AUTH_ACCOUNT_TYPE,
  SUPABASE_TABLE_NAME,
} from "../utils/constant";
import { GHL_SUBACCOUNT_AUTH_ATTRIBUTES } from "../constants/tableAttributes";

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const baseURL = process.env.BASE_URL;
const redirectURI = "http://localhost:3000/oauth/callback";

export const initiateAuth = (req: Request, res: Response) => {
  const authUrl = `${baseURL}/oauth/chooselocation?response_type=code&redirect_uri=${redirectURI}&client_id=${clientId}&scope=calendars.readonly calendars.write calendars/events.readonly calendars/events.write calendars/groups.readonly calendars/groups.write calendars/resources.readonly calendars/resources.write contacts.readonly contacts.write locations.readonly`;
  res.redirect(authUrl);
};

export const callback = async (req: Request, res: Response) => {
  try {
    const ghl_data = qs.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code: req?.query?.code,
      user_type: "Location",
    });

    const response = await axios.post(
      `${process.env.GHL_API_BASE_URL}/oauth/token`,
      ghl_data,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const locationId = response?.data?.locationId;
    const companyId = response?.data?.companyId;

    const data: IGHLSubaccountAuth = {
      ghl_location_id: locationId || "",
      ghl_company_id: companyId || "",
      access_token: response?.data?.access_token,
      refresh_token: response?.data?.refresh_token,
      expires_in: response?.data?.expires_in,
      account_type: locationId
        ? GHL_SUBACCOUNT_AUTH_ACCOUNT_TYPE.LOCATION
        : GHL_SUBACCOUNT_AUTH_ACCOUNT_TYPE.COMPANY,
      isActive: true,
    };

    let isExist = false,
      supabaseResponse;

    if (locationId) {
      console.log("locationId", locationId);
      const existingLocation = await matchByString(
        SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE,
        GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_LOCATION_ID,
        locationId
      );

      isExist = existingLocation && Object.keys(existingLocation).length > 0;

      if (isExist) {
        supabaseResponse = await updateData(
          SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE,
          data,
          GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_LOCATION_ID,
          locationId
        );
      }
    } else if (companyId) {
      console.log("companyId", companyId);
      const existingCompany = await matchByString(
        SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE,
        GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_COMPANY_ID,
        companyId
      );
      isExist = existingCompany && Object.keys(existingCompany).length > 0;

      if (isExist) {
        supabaseResponse = await updateData(
          SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE,
          data,
          GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_COMPANY_ID,
          companyId
        );
      }
    }

    if (!isExist) {
      supabaseResponse = await insertData(
        SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE,
        data
      );
    }

    const redirectUrl =
      (req.query.redirect_uri as string) || req.headers.referer || "/";
    console.log(supabaseResponse);
    if (supabaseResponse?.success) {
      return res.redirect(`${redirectUrl}?status=success`);
    } else {
      return res.redirect(`${redirectUrl}?status=error`);
    }
  } catch (error) {
    return res.status(500).json({ error: "Authentication failed" });
  }
};

export const refreshAuth = async (locationId: string) => {
  try {
    const existingLocation = await matchByString(
      SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE,
      GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_LOCATION_ID,
      locationId
    );

    if (Array.isArray(existingLocation) && existingLocation.length > 0) {
      const data = qs.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: existingLocation[0]?.refresh_token,
        user_type: "Location",
      });

      const response = await axios.post(
        `${process.env.GHL_API_BASE_URL}/oauth/token`,
        data,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const supabaseResponse = await updateData(
        SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE,
        {
          access_token: response?.data?.access_token,
          refresh_token: response?.data?.refresh_token,
          isActive: true,
        },
        GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_LOCATION_ID,
        locationId
      );

      console.log("supabaseResponse", supabaseResponse);

      if (!supabaseResponse.success) {
        return { success: false, message: "Failed to save API response." };
      }

      return { success: true };
    }
  } catch (error) {
    console.error(
      "Error in generating access token from refresh token:",
      error
    );
    return { success: false, message: "Internal Server Error" };
  }
};
