import { GHL_SUBACCOUNT_AUTH_ATTRIBUTES } from "../constants/tableAttributes";
import { matchByString, supabase } from "../services/supabaseClient";
import { GHL_SUBACCOUNT_AUTH_ACCOUNT_TYPE, SUPABASE_TABLE_NAME } from "../utils/constant";
import axios from "axios";

export const fetchCompanyInformation = async (companyId: string) => {
  try {
    if (!companyId) {
      return { success: false, error: "Missing companyId in body" };
    }
    const {data , error} = await supabase
      .from(SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE)
      .select(GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ACCESS_TOKEN)
      .eq(GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_COMPANY_ID, companyId)
      .eq(
        GHL_SUBACCOUNT_AUTH_ATTRIBUTES.ACCOUNT_TYPE,
        GHL_SUBACCOUNT_AUTH_ACCOUNT_TYPE.COMPANY
      );
    
    if (!error) {
      const response = await axios.get(
        `${process.env.GHL_API_BASE_URL}/companies/${companyId}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${data[0]?.access_token}`,
            Version: process.env.GHL_API_VERSION,
          },
        }
      );
      return response.data;
    }
      
    return { success: false, error };
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
    
    if (Array.isArray(existingLocation) && Object.keys(existingLocation).length > 0) {
      const response = await axios.get(
        `${process.env.GHL_API_BASE_URL}/locations/${locationId}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${existingLocation[0]?.access_token}`,
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
