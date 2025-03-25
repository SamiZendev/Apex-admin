import axios from "axios";
import qs from "qs";
import { Request, Response } from "express";
import {
  insertData,
  matchByString,
  supabase,
  updateData,
} from "../services/supabaseClient";
import { IGHLSubaccountAuth } from "../types/IGhlSubaccountAuth";
import {
  GHL_SUBACCOUNT_AUTH_ACCOUNT_TYPE,
  SUPABASE_TABLE_NAME,
} from "../utils/constant";
import {
  GHL_ACCOUNT_DETAILS,
  GHL_SUBACCOUNT_AUTH_ATTRIBUTES,
} from "../constants/tableAttributes";
import {
  fetchCompanyInformation,
  fetchSubaccountInformation,
} from "./ghlController";

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const baseURL = process.env.BASE_URL;
const redirectURI = "http://localhost:3000/oauth/callback";

export const initiateAuth = (req: Request, res: Response) => {
  const authUrl = `${baseURL}/oauth/chooselocation?response_type=code&redirect_uri=${redirectURI}&client_id=${clientId}&scope=calendars.readonly calendars.write calendars/events.readonly calendars/events.write calendars/groups.readonly calendars/groups.write calendars/resources.readonly calendars/resources.write contacts.readonly contacts.write locations.readonly companies.readonly`;
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
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_LOCATION_ID]: locationId || "",
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_COMPANY_ID]: companyId || "",
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ACCESS_TOKEN]:
        response?.data?.access_token,
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.REFRESH_TOKEN]:
        response?.data?.refresh_token,
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.EXPIRES_IN]: response?.data?.expires_in,
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ACCOUNT_TYPE]: locationId
        ? GHL_SUBACCOUNT_AUTH_ACCOUNT_TYPE.LOCATION
        : GHL_SUBACCOUNT_AUTH_ACCOUNT_TYPE.COMPANY,
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.IS_ACTIVE]: true,
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

      let accountDetails = {};
      if (locationId) {
        const subaccount = await fetchSubaccountInformation(locationId);
        accountDetails = {
          [GHL_ACCOUNT_DETAILS.AUTH_ID]:
            supabaseResponse?.responseData?.[0]?.id,
          [GHL_ACCOUNT_DETAILS.PHONE]: subaccount?.location?.phone || "",
          [GHL_ACCOUNT_DETAILS.NAME]: subaccount?.location?.name || "",
          [GHL_ACCOUNT_DETAILS.EMAIL]: subaccount?.location?.email || "",
        };
      } else {
        const company = await fetchCompanyInformation(companyId);
        await signUpNewUser(company?.company?.email);

        accountDetails = {
          [GHL_ACCOUNT_DETAILS.AUTH_ID]:
            supabaseResponse?.responseData?.[0]?.id,
          [GHL_ACCOUNT_DETAILS.PHONE]: company?.company?.phone || "",
          [GHL_ACCOUNT_DETAILS.NAME]: company?.company?.name || "",
          [GHL_ACCOUNT_DETAILS.EMAIL]: company?.company?.email || "",
        };
      }

      const responseAccountDetails = await insertData(
        SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS,
        accountDetails
      );

      if (!responseAccountDetails?.success) {
        console.log(responseAccountDetails);
      }
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
          [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ACCESS_TOKEN]:
            response?.data?.access_token,
          [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.REFRESH_TOKEN]:
            response?.data?.refresh_token,
          [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.IS_ACTIVE]: true,
        },
        GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_LOCATION_ID,
        locationId
      );

      console.log("supabaseResponse callback", supabaseResponse);

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

async function signUpNewUser(email: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: "example-password",
    });

    if (!error) {
      return { success: true, data };
    }

    return { success: false, error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export const signInUsingPassword = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    res.json({ token: data.session.access_token });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
