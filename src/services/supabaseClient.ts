import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URI!;
const supabaseKey = process.env.SUPABASE_PUBLIC_KEY!;
export const supabase = createClient(supabaseUrl, supabaseKey);

export const insertData = async (tableName: string, data: object) => {
  try {
    const { data: insertData, error } = await supabase
      .from(tableName)
      .insert(data)
      .select();

    if (error) {
      console.error("Insert Error:", error);
      throw new Error(error.message);
    }

    return {
      success: true,
      message: "Data inserted successfully",
      responseData: insertData,
    };
  } catch (err: unknown) {
    console.log("insertData err", err);
    const errorMessage =
      err instanceof Error ? err.message : "An unknown error occurred";
    return { success: false, message: errorMessage };
  }
};

export const matchByString = async (
  tableName: string,
  columnName: string,
  value: string | number
) => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select("id, *")
      .eq(columnName, value);
    if (error) {
      console.error("Matching Error:", error);
      throw new Error(error.message);
    }

    return data;
  } catch (err: unknown) {
    console.log("matchByString err", err);
    const errorMessage =
      err instanceof Error ? err.message : "An unknown error occurred";
    return { success: false, message: errorMessage };
  }
};

export const updateData = async (
  tableName: string,
  data: object,
  toMatchColumnName: string,
  toMatchColumnValue: any
) => {
  try {
    const { data: updatedData, error } = await supabase
      .from(tableName)
      .update(data)
      .eq(toMatchColumnName, toMatchColumnValue)
      .select();

    if (error) {
      console.error("Update Error:", error);
      throw new Error(error.message);
    }

    return {
      success: true,
      message: "Data inserted successfully",
      responseData: updatedData,
    };
  } catch (err: unknown) {
    console.log("updateData err", err);
    const errorMessage =
      err instanceof Error ? err.message : "An unknown error occurred";
    return { success: false, message: errorMessage };
  }
};
