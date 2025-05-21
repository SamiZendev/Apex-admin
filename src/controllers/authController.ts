import axios from "axios";
import qs from "qs";
import { Request, Response } from "express";
import {
  insertData,
  matchByString,
  supabase,
  updateData,
} from "../services/supabaseClient";
import {
  ACCOUNT_SOURCE,
  GHL_SUBACCOUNT_AUTH_ACCOUNT_TYPE,
  SUPABASE_TABLE_NAME,
} from "../utils/constant";
import {
  GHL_ACCOUNT_DETAILS,
  GHL_SUBACCOUNT_AUTH_ATTRIBUTES,
  USER_DATA,
} from "../constants/tableAttributes";
import {
  fetchCompanyInformation,
  fetchSubaccountInformation,
} from "./ghlController";
import { formatTimestamp, generateRandomPassword } from "../utils/helpers";
import { GHLSubaccountAuth, RefreshAuthResponse } from "../types/interfaces";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendEmail } from "../services/email";

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const baseURL = process.env.BASE_URL;
const redirectURI = process.env.GHL_REDIRECT_URI;
const SECRET_KEY = process.env.JWT_SECRET as string;

export const initiateAuth = (req: Request, res: Response) => {
  const authUrl = `${baseURL}/oauth/chooselocation?response_type=code&redirect_uri=${redirectURI}&client_id=${clientId}&scope=calendars.readonly calendars.write calendars/events.readonly calendars/events.write calendars/groups.readonly calendars/groups.write calendars/resources.readonly calendars/resources.write contacts.readonly contacts.write locations.readonly companies.readonly locations/customFields.write locations/customFields.readonly locations/customValues.write locations/customValues.readonly`;
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

    const data: GHLSubaccountAuth = {
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
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.SOURCE]: ACCOUNT_SOURCE.GHL,
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
      const { data: existingCompany, error } = await supabase
        .from(SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE)
        .select("*")
        .eq(
          GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ACCOUNT_TYPE,
          GHL_SUBACCOUNT_AUTH_ACCOUNT_TYPE.COMPANY
        )
        .eq(GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_COMPANY_ID, companyId);

      isExist = Array.isArray(existingCompany) && existingCompany.length > 0;

      if (isExist) {
        const { data: updateData, error } = await supabase
          .from(SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE)
          .update(data)
          .eq(
            GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ACCOUNT_TYPE,
            GHL_SUBACCOUNT_AUTH_ACCOUNT_TYPE.COMPANY
          )
          .eq(GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_COMPANY_ID, companyId)
          .select();

        if (!error) {
          supabaseResponse = { responseData: updateData, success: true };
        }
      }
    }
    let responseAccountDetails;
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
          [GHL_ACCOUNT_DETAILS.GHL_ID]: subaccount?.location?.id || "",
          [GHL_ACCOUNT_DETAILS.GHL_COMPANY_ID]:
            subaccount?.location?.companyId || "",
          [GHL_ACCOUNT_DETAILS.GHL_LOCATION_TIMEZONE]:
            subaccount?.location?.timezone || "UTC",
        };
      } else {
        const company = await fetchCompanyInformation(companyId);
        await signUpNewUser(company?.company);

        accountDetails = {
          [GHL_ACCOUNT_DETAILS.AUTH_ID]:
            supabaseResponse?.responseData?.[0]?.id,
          [GHL_ACCOUNT_DETAILS.PHONE]: company?.company?.phone || "",
          [GHL_ACCOUNT_DETAILS.NAME]: company?.company?.name || "",
          [GHL_ACCOUNT_DETAILS.EMAIL]: company?.company?.email || "",
          [GHL_ACCOUNT_DETAILS.GHL_ID]: company?.company?.id || "",
        };
      }

      responseAccountDetails = await insertData(
        SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS,
        accountDetails
      );

      if (!responseAccountDetails?.success) {
        console.log(responseAccountDetails);
      }
    }

    console.log(supabaseResponse);
    if (supabaseResponse?.success) {
      const clientId = responseAccountDetails?.responseData?.[0]?.id;
      return res.redirect(
        `${process.env.REDIRECT_URL}?status=success&client_id=${clientId}`
      );
    } else {
      return res.redirect(`${process.env.REDIRECT_URL}?status=error`);
    }
  } catch (error) {
    return res.status(500).json({ error: "Authentication failed" });
  }
};

export const refreshAuth = async (
  id: string,
  accountType: string
): Promise<RefreshAuthResponse> => {
  try {
    const type =
      accountType === GHL_SUBACCOUNT_AUTH_ACCOUNT_TYPE.COMPANY
        ? GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_COMPANY_ID
        : GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_LOCATION_ID;

    const { data: existingData, error } = await supabase
      .from(SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE)
      .select("*")
      .eq(type, id)
      .eq(GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ACCOUNT_TYPE, accountType);
    console.log("refreshtoken");
    if (Array.isArray(existingData) && existingData.length > 0 && !error) {
      const data = qs.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: existingData[0]?.refresh_token,
        user_type:
          accountType === GHL_SUBACCOUNT_AUTH_ACCOUNT_TYPE.COMPANY
            ? "Company"
            : "Location",
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

      const { data: supabaseResponse, error } = await supabase
        .from(SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE)
        .update({
          [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ACCESS_TOKEN]:
            response?.data?.access_token,
          [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.REFRESH_TOKEN]:
            response?.data?.refresh_token,
          [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.IS_ACTIVE]: true,
          [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.UPDATED_AT]: formatTimestamp(
            new Date()
          ),
        })
        .eq(type, id)
        .eq(GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ACCOUNT_TYPE, accountType)
        .select();

      if (error) {
        return {
          success: false,
          message: "Error updating token",
          error: { ...error },
        };
      }
      return { success: true, data: supabaseResponse as GHLSubaccountAuth[] };
    }
    return {
      success: false,
      message: "No existing data found or an error occurred",
      error: { ...error },
    };
  } catch (error) {
    console.error(
      "Error in generating access token from refresh token:",
      error
    );
    return { success: false, message: "Internal Server Error" };
  }
};

async function signUpNewUser(company: any) {
  try {
    const password = generateRandomPassword();
    console.log("password ", password);
    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = {
      [USER_DATA.GHL_COMPANY_ID]: company?.id,
      [USER_DATA.EMAIL]: company?.email,
      [USER_DATA.NAME]: company?.name,
      [USER_DATA.PASSWORD]: hashedPassword,
    };
    const data = await insertData(SUPABASE_TABLE_NAME.USERS, userData);
    const message = `
      Hi ${company?.name},
      Here is your temporary password:
      🔐 Password: ${password}
      Please log in using this password and change it immediately for your security.
      If you did not request this, please ignore this email or contact support.
      Best regards,  
      Apex Acquisition
      `;
    if (data.success && company?.email) {
      await sendEmail(
        company?.email,
        "Welcome - Here is your password",
        message
      );
    }
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export const signInUsingPassword = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const { data, error } = await supabase
      .from(SUPABASE_TABLE_NAME.USERS)
      .select("*")
      .eq(USER_DATA.EMAIL, email)
      .single();

    if (error || !data) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, data.password);
    console.log(isMatch);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: data.id, email: data.email }, SECRET_KEY, {
      expiresIn: "1h",
    });
    res.json({
      data: {
        token,
        ...data,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error });
  }
};
