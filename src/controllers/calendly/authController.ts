import { ACCOUNT_SOURCE, SUPABASE_TABLE_NAME } from "../../utils/constant";
import {
  GHL_ACCOUNT_DETAILS,
  GHL_SUBACCOUNT_AUTH_ATTRIBUTES,
} from "../../constants/tableAttributes";
import { CalendlyAccountAuth } from "../../types/interfaces";
import axios from "axios";
import { Request, Response } from "express";
import qs from "qs";
import {
  insertData,
  matchByString,
  supabase,
  updateData,
} from "../../services/supabaseClient";
import { getCurrentUser } from "./controller";
import { formatTimestamp } from "../../utils/helpers";

const clientId = process.env.CALENDLY_CLIENT_ID;
const clientSecret = process.env.CALENDLY_CLIENT_SECRET;
const baseURL = process.env.CALENDLY_AUTH_BASE_URL;
const redirectURI = process.env.CALENDLY_REDIRECT_URL;

export const initiateCalendlyAuth = (req: Request, res: Response) => {
  const authUrl = `${baseURL}/oauth/authorize?response_type=code&redirect_uri=${redirectURI}&client_id=${clientId}`;
  res.redirect(authUrl);
};

export const calendlyCallback = async (req: Request, res: Response) => {
  const { error, error_description } = req.query;
  if (error) {
    return res.redirect(
      `${process.env.REDIRECT_URL}/dashboard?status=error&error_description=${error_description}`
    );
  }
  try {
    const calendlyData = qs.stringify({
      grant_type: "authorization_code",
      code: req?.query?.code,
      redirect_uri: redirectURI,
    });

    const response = await axios.post(`${baseURL}/oauth/token`, calendlyData, {
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(
          `${clientId}:${clientSecret}`
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const ownerId = response?.data?.owner.split("/").pop();
    const accessToken = response?.data?.access_token;
    const data: CalendlyAccountAuth = {
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ACCESS_TOKEN]: accessToken,
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.CALENDLY_OWNER]: ownerId,
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.CALENDLY_ORGANIZATION]:
        response?.data?.organization,
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.SOURCE]: ACCOUNT_SOURCE.CALENDLY,
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.REFRESH_TOKEN]:
        response?.data?.refresh_token,
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.EXPIRES_IN]: response?.data?.expires_in,
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.IS_ACTIVE]: true,
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_LOCATION_ID]: ownerId,
    };

    let isExist = false,
      supabaseResponse;

    if (ownerId) {
      const existingOwner = await matchByString(
        SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE,
        GHL_SUBACCOUNT_AUTH_ATTRIBUTES.CALENDLY_OWNER,
        ownerId
      );

      isExist = existingOwner && Object.keys(existingOwner).length > 0;

      if (isExist) {
        supabaseResponse = await updateData(
          SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE,
          data,
          GHL_SUBACCOUNT_AUTH_ATTRIBUTES.CALENDLY_OWNER,
          ownerId
        );
      }
    }

    let responseAccountDetails;
    if (!isExist) {
      supabaseResponse = await insertData(
        SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE,
        data
      );

      await createWebhookSubscription(
        accessToken,
        response?.data?.organization,
        response?.data?.owner
      );
      let accountDetails = {};
      if (accessToken) {
        const userDetails = await getCurrentUser(accessToken);
        accountDetails = {
          [GHL_ACCOUNT_DETAILS.AUTH_ID]:
            supabaseResponse?.responseData?.[0]?.id,
          [GHL_ACCOUNT_DETAILS.NAME]: userDetails?.resource?.name || "",
          [GHL_ACCOUNT_DETAILS.EMAIL]: userDetails?.resource?.email || "",
          [GHL_ACCOUNT_DETAILS.GHL_LOCATION_TIMEZONE]:
            userDetails?.resource?.timezone || "UTC",
          [GHL_ACCOUNT_DETAILS.CALENDLY_SLUG]:
            userDetails?.resource?.slug || "",
          [GHL_ACCOUNT_DETAILS.CALENDLY_SCHEDULING_URL]:
            userDetails?.resource?.scheduling_url || "",
          [GHL_ACCOUNT_DETAILS.GHL_ID]: ownerId || "",
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
    console.log("supabaseResponse", supabaseResponse);
    if (supabaseResponse?.success) {
      const clientId = responseAccountDetails?.responseData?.[0]?.id;
      return res.redirect(
        `${process.env.REDIRECT_URL}?status=success&client_id=${clientId}`
      );
    } else {
      return res.redirect(`${process.env.REDIRECT_URL}?status=error`);
    }
  } catch (error) {
    console.error("Error during Calendly authentication:", error);
    return res.redirect(process.env.REDIRECT_URL as string);
  }
};

export const refreshToken = async (refreshToken: string) => {
  try {
    const calendlyData = qs.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const response = await axios.post(`${baseURL}/oauth/token`, calendlyData, {
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(
          `${clientId}:${clientSecret}`
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const ownerId = response?.data?.owner.split("/").pop();
    const accessToken = response?.data?.access_token;

    if (ownerId) {
      const { data: supabaseResponse, error } = await supabase
        .from(SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE)
        .update({
          [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ACCESS_TOKEN]: accessToken,
          [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.REFRESH_TOKEN]:
            response?.data?.refresh_token,

          [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.IS_ACTIVE]: true,
          [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.UPDATED_AT]: formatTimestamp(
            new Date()
          ),
        })
        .eq(GHL_SUBACCOUNT_AUTH_ATTRIBUTES.CALENDLY_OWNER, ownerId)
        .select();

      if (error) {
        return {
          success: false,
          message: "Error updating token",
          error: { ...error },
        };
      }
      return { success: true, data: supabaseResponse as CalendlyAccountAuth[] };
    }
    return {
      success: false,
      message: "No existing data found or an error occurred",
      error: {},
    };
  } catch (error) {
    console.error("Error during token refresh:", error);
  }
};

export const createWebhookSubscription = async (
  accessToken: string,
  organization: string,
  user: string
) => {
  try {
    const response = await axios.post(
      `${process.env.CALENDLY_API_BASE_URL}/webhook_subscriptions`,
      {
        url: `${process.env.APP_URL}/api/webhook`,
        events: ["invitee.created", "invitee.canceled"],
        organization: organization,
        user: user,
        scope: "user",
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return {
      success: true,
      message: "Webhook subscription created successfully",
      data: response.data,
    };
  } catch (error: any) {
    console.error("Calendly Webhook Error:", error);
  }
};
