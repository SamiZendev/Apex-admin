import axios from "axios";
import { Request, Response } from "express";
import { getListOfAllUsers } from "./controller";
import {
  GHL_ACCOUNT_DETAILS,
  GHL_SUBACCOUNT_AUTH_ATTRIBUTES,
} from "../../constants/tableAttributes";
import { ACCOUNT_SOURCE, SUPABASE_TABLE_NAME } from "../../utils/constant";
import {
  insertData,
  matchByString,
  updateData,
} from "../../services/supabaseClient";

export const onceHubAuth = async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    const allusers = await getListOfAllUsers(apiKey);

    const accountOwnerUser = allusers?.data?.filter(
      (user: any) => user.role_name === "Account Owner"
    );

    const data = {
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ACCESS_TOKEN]: apiKey,
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.SOURCE]: ACCOUNT_SOURCE.ONCEHUB,
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.REFRESH_TOKEN]: "",
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.EXPIRES_IN]: "",
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.IS_ACTIVE]: true,
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_LOCATION_ID]:
        accountOwnerUser[0]?.id || "",
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ONCEHUB_ID]:
        accountOwnerUser[0]?.id || "",
    };

    let isExist = false,
      supabaseResponse;

    if (accountOwnerUser[0].id) {
      const existingOwner = await matchByString(
        SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE,
        GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ONCEHUB_ID,
        accountOwnerUser[0].id
      );

      isExist = existingOwner && Object.keys(existingOwner).length > 0;

      if (isExist) {
        supabaseResponse = await updateData(
          SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE,
          data,
          GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ONCEHUB_ID,
          accountOwnerUser[0].id
        );
      }
    }

    let responseAccountDetails;
    if (!isExist) {
      supabaseResponse = await insertData(
        SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE,
        data
      );

      await createWebhookSubscription(apiKey);

      const accountDetails = {
        [GHL_ACCOUNT_DETAILS.AUTH_ID]: supabaseResponse?.responseData?.[0]?.id,
        [GHL_ACCOUNT_DETAILS.NAME]:
          `${accountOwnerUser[0]?.first_name} ${accountOwnerUser[0]?.last_name}` ||
          "",
        [GHL_ACCOUNT_DETAILS.EMAIL]: accountOwnerUser[0]?.email || "",
        [GHL_ACCOUNT_DETAILS.GHL_LOCATION_TIMEZONE]: "UTC",
        [GHL_ACCOUNT_DETAILS.GHL_ID]: accountOwnerUser[0].id || "",
      };

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
      const clientId =
        responseAccountDetails?.responseData?.[0]?.id ||
        supabaseResponse?.responseData?.[0]?.id;
      return res.status(200).json({
        status: "success",
        redirectUrl: `${process.env.REDIRECT_URL}?status=success&client_id=${clientId}`,
      });
    } else {
      return res.status(500).json({
        status: "error",
      });
    }
  } catch (error) {
    console.error("Error during Calendly authentication:", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
};

export const createWebhookSubscription = async (apiKey: string) => {
  try {
    const response = await axios.post(
      `${process.env.ONCEHUB_API_BASE_URL}/webhooks`,
      {
        url: `${process.env.APP_URL}/api/webhook`,
        events: ["booking"],
        name: process.env.GHL_APP_NAME,
      },
      {
        headers: {
          "API-Key": apiKey,
          Accept: "application/json",
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
