import {
  insertData,
  matchByString,
  supabase,
  updateData,
} from "./../services/supabaseClient";
import { Request, Response } from "express";
import axios from "axios";
import { IGHLSubaccountAuth } from "@/types/IGhlSubaccountAuth";
import { GHL_SUBACCOUNT_AUTH_ATTRIBUTES } from "../constants/tableAttributes";
import {
  GHL_SUBACCOUNT_AUTH_ACCOUNT_TYPE,
  SUPABASE_TABLE_NAME,
} from "../utils/constant";

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
      ghl_location_id: locationId || "",
      ghl_company_id: companyId,
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
    }

    console.log("supabaseResponse", supabaseResponse);

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
      isActive: false,
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

    console.log("supabaseResponse", supabaseResponse);

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
