import { STYLE_CONFIGURATIONS } from "../constants/tableAttributes";
import { supabase } from "../services/supabaseClient";
import { SUPABASE_TABLE_NAME } from "../utils/constant";
import z from "zod";
import { Request, Response } from "express";

export const saveStyleConfiguration = async (req: Request, res: Response) => {
  const styleSchema = z.object({
    email: z.string().email(),
    bgColor: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i),
    fontSize: z.number().min(10).max(48),
  });

  const parseResult = styleSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ errors: parseResult.error.errors });
  }

  const { email, bgColor, fontSize } = parseResult.data;
  const { error } = await supabase
    .from(SUPABASE_TABLE_NAME.STYLE_CONFIGURATIONS)
    .upsert(
      {
        [STYLE_CONFIGURATIONS.EMAIL]: email,
        [STYLE_CONFIGURATIONS.BG_COLOR]: bgColor,
        [STYLE_CONFIGURATIONS.FONT_SIZE]: fontSize,
        [STYLE_CONFIGURATIONS.UPDATED_AT]: new Date().toISOString(),
      },
      { onConflict: "email" }
    );

  if (error) {
    console.error("Supabase insert error:", error);
    return res.status(500).json({ message: "Failed to save data." });
  }

  return res.status(200).json({ message: "Style configuration saved." });
};

export const getStyleConfiguration = async (_: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLE_NAME.STYLE_CONFIGURATIONS)
      .select("*");

    if (error) {
      return res.status(404).json({
        success: false,
        message: "Style configuration not found",
        error,
      });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err });
  }
};
