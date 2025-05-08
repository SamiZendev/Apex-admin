import { UTM_PARAMETERS } from "./../constants/tableAttributes";
import { supabase } from "../services/supabaseClient";
import { SUPABASE_TABLE_NAME } from "../utils/constant";
import { Request, Response } from "express";

export const createUTM = async (req: Request, res: Response) => {
  const { key } = req.body;

  if (!key || typeof key !== "string") {
    return res
      .status(400)
      .json({ error: "Key is required and must be a string." });
  }

  const { data, error } = await supabase
    .from(SUPABASE_TABLE_NAME.UTM_PARAMETERS)
    .insert({ [UTM_PARAMETERS.UTM_PARAMETER]: key })
    .select();

  if (error) return res.status(500).json({ error });
  res.status(201).json(data);
};

export const getAllUTM = async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from(SUPABASE_TABLE_NAME.UTM_PARAMETERS)
    .select("*");
  if (error) return res.status(500).json({ error });
  res.json(data);
};

export const getUTMById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from(SUPABASE_TABLE_NAME.UTM_PARAMETERS)
    .select("*")
    .eq(UTM_PARAMETERS.ID, id)
    .single();

  if (error) return res.status(404).json({ error });
  res.json(data);
};

export const updateUTM = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { key } = req.body;

  if (!key || typeof key !== "string") {
    return res
      .status(400)
      .json({ error: "Key is required and must be a string." });
  }

  const { data, error } = await supabase
    .from(SUPABASE_TABLE_NAME.UTM_PARAMETERS)
    .update({ [UTM_PARAMETERS.UTM_PARAMETER]: key })
    .eq(UTM_PARAMETERS.ID, id)
    .select();

  if (error) return res.status(500).json({ error });
  res.json(data);
};

export const deleteUTM = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { error } = await supabase
    .from(SUPABASE_TABLE_NAME.UTM_PARAMETERS)
    .delete()
    .eq(UTM_PARAMETERS.ID, id);

  if (error) return res.status(500).json({ error });
  res.json({ message: "Key deleted successfully" });
};
