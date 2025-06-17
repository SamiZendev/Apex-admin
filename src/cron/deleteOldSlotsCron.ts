import cron from "node-cron";
import dayjs from "dayjs";
import { supabase } from "../services/supabaseClient";
import { SUPABASE_TABLE_NAME } from "../utils/constant";
import { logger } from "../utils/logger";

// This runs every day at 11:55 PM server time
export const deleteOldSlots = () => {
  cron.schedule(
    "55 23 * * *",
    async () => {
      try {
        const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");

        const { error } = await supabase
          .from(SUPABASE_TABLE_NAME.CALENDAR_SLOTS)
          .delete()
          .eq("date", yesterday);

        if (error) {
          logger.error({
            message: "[CRON][deleteOldSlots] Error deleting old slots",
            error: error,
          });
        }
      } catch (err) {
        console.error("[CRON][deleteOldSlots] Unexpected error", err);
      }
    },
    {
      timezone: "UTC",
    }
  );
};
