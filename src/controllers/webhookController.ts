import {
  insertData,
  matchByString,
  supabase,
  updateData,
} from "./../services/supabaseClient";
import { Request, Response } from "express";
import axios from "axios";
import { IGHLSubaccountAuth } from "@/types/IGhlSubaccountAuth";
import { GHL_ACCOUNT_DETAILS, GHL_SUBACCOUNT_AUTH_ATTRIBUTES } from "../constants/tableAttributes";
import {
  GHL_SUBACCOUNT_AUTH_ACCOUNT_TYPE,
  SUPABASE_TABLE_NAME,
} from "../utils/constant";
import { fetchSubaccountInformation } from "./ghlController";

const generateAccessToken = async (
  data: any
): Promise<{ success: boolean; message?: string }> => {
  try {
    const { installType, companyId, locationId } = data;
    console.log("generateAccessToken installType", installType);

    if (installType !== "Location") {
      return { success: false, message: "Ignoring non-location webhook." };
    }

    const { data: authData, error: authError } = await supabase
      .from(SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE)
      .select(GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ACCESS_TOKEN)
      .eq(GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_COMPANY_ID, companyId)
      .eq(
        GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ACCOUNT_TYPE,
        GHL_SUBACCOUNT_AUTH_ACCOUNT_TYPE.COMPANY
      )
      .single();

    if (authError || !authData) {
      return { success: false, message: "Access token not found." };
    }

    const { access_token } = authData;
    const response = await axios.post(
      `${process.env.GHL_API_BASE_URL}/oauth/locationToken`,
      {
        locationId: locationId,
        companyId: companyId,
      },
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
          Version: process.env.GHL_API_VERSION,
        },
      }
    );

    const insert: IGHLSubaccountAuth = {
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_LOCATION_ID]: locationId || "",
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_COMPANY_ID]: companyId,
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ACCESS_TOKEN]: response?.data?.access_token,
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.REFRESH_TOKEN]: response?.data?.refresh_token,
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.EXPIRES_IN]: response?.data?.expires_in,
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ACCOUNT_TYPE]: locationId
        ? GHL_SUBACCOUNT_AUTH_ACCOUNT_TYPE.LOCATION
        : GHL_SUBACCOUNT_AUTH_ACCOUNT_TYPE.COMPANY,
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.IS_ACTIVE]: true,
    };

    let isExist = false,
      supabaseResponse;

    const existingLocation = await matchByString(
      SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE,
      GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_LOCATION_ID,
      locationId
    );
    isExist = existingLocation && Object.keys(existingLocation).length > 0;

    if (isExist) {
      supabaseResponse = await updateData(
        SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE,
        insert,
        GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_LOCATION_ID,
        locationId
      );
    } else {
      supabaseResponse = await insertData(
        SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE,
        insert
      );
      
      const subaccount = await fetchSubaccountInformation(locationId);
      const accountDetails = {
        [GHL_ACCOUNT_DETAILS.AUTH_ID]: supabaseResponse?.responseData?.[0]?.id,
        [GHL_ACCOUNT_DETAILS.PHONE]: subaccount?.location?.phone || "",
        [GHL_ACCOUNT_DETAILS.NAME]: subaccount?.location?.name || "",
        [GHL_ACCOUNT_DETAILS.EMAIL]: subaccount?.location?.email || "",
      };
      
      const responseAccountDetails = await insertData(
        SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS,
        accountDetails
      );
      
      if (!responseAccountDetails?.success) {
        console.log("responseAccountDetails install webhook",responseAccountDetails)
      } 
    }

    console.log("supabaseResponse install webhook", supabaseResponse);

    if (!supabaseResponse.success) {
      return { success: false, message: "Failed to save API response." };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in generateAccessToken:", error);
    return { success: false, message: "Internal Server Error" };
  }
};

const changeAccountStatus = async (
  data: any
): Promise<{ success: boolean; message?: string }> => {
  try {
    const { companyId, locationId } = data;

    let supabaseResponse;

    const update = {
      [GHL_SUBACCOUNT_AUTH_ATTRIBUTES.IS_ACTIVE]: false,
    };

    if (locationId) {
      const existingLocation = await matchByString(
        SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE,
        GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_LOCATION_ID,
        locationId
      );

      if (existingLocation && Object.keys(existingLocation).length > 0) {
        supabaseResponse = await updateData(
          SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE,
          update,
          GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_LOCATION_ID,
          locationId
        );
      }
    } else {
      const existingCompany = await matchByString(
        SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE,
        GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_COMPANY_ID,
        companyId
      );
      if (existingCompany && Object.keys(existingCompany).length > 0) {
        supabaseResponse = await updateData(
          SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE,
          update,
          GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_COMPANY_ID,
          companyId
        );
      }
    }

    console.log("supabaseResponse uninstall webhook", supabaseResponse);

    if (!supabaseResponse) {
      return { success: false, message: "Failed to save API response." };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in generateAccessToken:", error);
    return { success: false, message: "Internal Server Error" };
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const { type } = req.body;

    switch (type) {
      case "INSTALL":
        const installResponse = await generateAccessToken(req.body);
        if (!installResponse.success) {
          return res.status(400).json({ message: installResponse.message });
        }
        return res.json({ message: "Token generated and saved successfully." });
      case "UNINSTALL":
        const uninstallResponse = await changeAccountStatus(req.body);
        if (!uninstallResponse.success) {
          return res.status(400).json({ message: uninstallResponse.message });
        }
        return res.json({ message: "Token generated and saved successfully." });
      default:
        return res.status(400).json({ message: "Unhandled webhook type." });
    }
  } catch (error) {
    console.error("Webhook Handling Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
