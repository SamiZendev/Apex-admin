import { GHL_SUBACCOUNT_AUTH_ATTRIBUTES } from "../../constants/tableAttributes";
import { matchByString } from "../../services/supabaseClient";
import { SUPABASE_TABLE_NAME } from "../../utils/constant";
import axios from "axios";
import { Request, Response } from "express";

export const getListOfAllUsers = async (apiKey: string) => {
  try {
    if (!apiKey) {
      return { success: false, error: "Missing apiKey in body" };
    }

    const response = await axios.get(
      `${process.env.ONCEHUB_API_BASE_URL}/users?limit=100`,
      {
        headers: {
          Accept: "application/json",
          "API-Key": apiKey,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error(
      "Error fetching oncehub account details:",
      error?.response?.data || error.message
    );
    return {
      error: "Failed to fetch oncehub account details",
      details: error?.response?.data || error.message,
    };
  }
};

export const getListOfAllCalendars = async (req: Request, res: Response) => {
  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        success: false,
        message: "Missing or invalid 'id' query parameter.",
      });
    }

    const existingLocation = await matchByString(
      SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE,
      GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_LOCATION_ID,
      id
    );

    let apiKey = "";

    if (
      Array.isArray(existingLocation) &&
      existingLocation.length > 0 &&
      existingLocation[0]?.access_token
    ) {
      apiKey = existingLocation[0].access_token;
    } else {
      return res.status(404).json({
        success: false,
        message: "No matching location or API key found.",
      });
    }

    const response = await axios.get(
      `${process.env.ONCEHUB_API_BASE_URL}/booking-calendars?limit=100`,
      {
        headers: {
          "API-Key": apiKey,
          Accept: "application/json",
        },
      }
    );

    const calendars = response.data.data.map(
      (item: { id: string; name: string }) => ({
        id: item.id,
        name: item.name,
      })
    );

    return res.status(200).json({
      success: true,
      message: "Calendars fetched successfully",
      data: calendars,
    });
  } catch (error: any) {
    console.error("OnceHub API error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch calendars from OnceHub",
      details: error.response?.data || error.message,
    });
  }
};
