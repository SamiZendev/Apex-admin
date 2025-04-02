import { GHL_ACCOUNT_DETAILS } from "./../constants/tableAttributes";
import { Request, Response } from "express";
import {
  matchByString,
  supabase,
  updateData,
} from "../services/supabaseClient";
import { SUPABASE_TABLE_NAME } from "../utils/constant";
import z from "zod";
import {
  fetchAndSaveCalendarBookedSlot,
  fetchAndSaveCalendarInformation,
} from "./ghlController";

export const getDataById = async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    const data = await matchByString(
      SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS,
      GHL_ACCOUNT_DETAILS.GHL_ID,
      id as string
    );

    if (Array.isArray(data) && Object.keys(data).length > 0) {
      return res.status(200).json({ success: true, message: "", data });
    }

    return res
      .status(404)
      .json({ success: false, message: "Data Not Found", data: [] });
  } catch (error: any) {
    console.error(
      "Error fetching data:",
      error?.response?.data || error.message
    );
    return res.status(500).json({
      error: "Failed to fetch data",
      details: error?.response?.data || error.message,
    });
  }
};

export const configureSubaccount = async (req: Request, res: Response) => {
  try {
    const updateSchema = z.object({
      [GHL_ACCOUNT_DETAILS.GHL_ID]: z.string().min(1, "ghl_id is required"),
      [GHL_ACCOUNT_DETAILS.SPEND_AMOUNT]: z.string(),
      [GHL_ACCOUNT_DETAILS.GHL_CALENDAR_ID]: z.string(),
      [GHL_ACCOUNT_DETAILS.PRIORITY_SCORE]: z.string(),
      [GHL_ACCOUNT_DETAILS.PHONE]: z.string().optional(),
      [GHL_ACCOUNT_DETAILS.NAME]: z.string().optional(),
      [GHL_ACCOUNT_DETAILS.EMAIL]: z.string().email().optional(),
      [GHL_ACCOUNT_DETAILS.REDIRECT_URL]: z.string().url(),
    });

    const validatedData = updateSchema.parse(req.body);
    const { ghl_id, ...updateFields } = validatedData;
    if (Object.keys(updateFields).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update" });
    }

    const calendar = await fetchAndSaveCalendarInformation(
      validatedData?.[GHL_ACCOUNT_DETAILS.GHL_CALENDAR_ID],
      ghl_id
    );

    const calendarEvents = await fetchAndSaveCalendarBookedSlot(
      validatedData?.[GHL_ACCOUNT_DETAILS.GHL_CALENDAR_ID],
      ghl_id
    );

    if (
      calendar?.success &&
      "responseData" in calendar &&
      Array.isArray(calendar.responseData) &&
      calendar.responseData.length > 0
    ) {
      const response = await updateData(
        SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS,
        {
          ...updateFields,
          [GHL_ACCOUNT_DETAILS.CALENDAR_ID]: calendar?.responseData[0]?.id,
        },
        GHL_ACCOUNT_DETAILS.GHL_ID,
        ghl_id
      );

      return res.status(200).json({
        success: true,
        message: "Data updated successfully",
        data: {
          userData: { ...response },
          calendarData: { ...calendar },
        },
      });
    }

    return res
      .status(500)
      .json({ success: false, message: "Database update failed", calendar });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: error.errors,
      });
    }
    return res
      .status(500)
      .json({ success: false, message: "Internal server error", error: error });
  }
};

export const getListOfAllSubaccountByCompanyId = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.query;
    const { data, error } = await supabase
      .from(SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS)
      .select("*")
      .eq(GHL_ACCOUNT_DETAILS.GHL_COMPANY_ID, id);

    if (error) {
      return res
        .status(404)
        .json({ success: false, message: "Company Not Found", data: data });
    }
    return res.status(200).json({ success: true, message: "", data });
  } catch (error: any) {
    console.error(
      "Error fetching data:",
      error?.response?.data || error.message
    );
    return res.status(500).json({
      error: "Failed to fetch data",
      details: error?.response?.data || error.message,
    });
  }
};
