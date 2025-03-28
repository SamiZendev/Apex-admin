import { GHL_ACCOUNT_DETAILS } from "./../constants/tableAttributes";
import { Request, Response } from "express";
import { matchByString, updateData } from "../services/supabaseClient";
import { SUPABASE_TABLE_NAME } from "../utils/constant";
import z from "zod";

export const getDataById = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    const data = await matchByString(
      SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS,
      GHL_ACCOUNT_DETAILS.GHL_ID,
      id
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

export const configureSubaccount = async (
  req: Request,
  res: Response
) => {
  try {
    const updateSchema = z.object({
      ghl_id: z.string().min(1, "ghl_id is required"),
      spend_amount: z.string(),
      calendar_id: z.string(),
      contact_phone: z.string().optional(),
      name: z.string().optional(),
      contact_email: z.string().email().optional(),
      redirect_url: z.string().url(),
    });

    const validatedData = updateSchema.parse(req.body);
    const { ghl_id, ...updateFields } = validatedData;
    if (Object.keys(updateFields).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update" });
    }
    const response = await updateData(
      SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS,
      updateFields,
      GHL_ACCOUNT_DETAILS.GHL_ID,
      ghl_id
    );

    if (response?.success) {
      return res
        .status(200)
        .json({
          success: true,
          message: "Data updated successfully",
          response,
        });
    }

    return res
      .status(500)
      .json({ success: false, message: "Database update failed", response });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({
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
