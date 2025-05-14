import { CALENDAR_DATA } from "../constants/tableAttributes";
import { fetchAndSaveCalendarInformation } from "../controllers/ghlController";
import { supabase } from "../services/supabaseClient";
import { SUPABASE_TABLE_NAME } from "../utils/constant";
import { logErrorToFile } from "../utils/logger";
import cron from "node-cron";

export const updateCalendarConfiguration = () => {
  cron.schedule("0 0 * * *", async () => {
    logErrorToFile("Updating calendar data");
    const { data: calendar_data, error } = await supabase
      .from(SUPABASE_TABLE_NAME.CALENDAR_DATA)
      .select("*");

    if (error) {
      logErrorToFile(error, "Fetching calendar data");
      return;
    }

    if (!calendar_data) {
      logErrorToFile(
        new Error("No calendar data found"),
        "Calendar data check"
      );
      return;
    }

    for (const calendar of calendar_data) {
      try {
        await fetchAndSaveCalendarInformation(
          calendar[CALENDAR_DATA.CALENDAR_ID],
          calendar[CALENDAR_DATA.GHL_LOCATION_ID]
        );
      } catch (err) {
        logErrorToFile(
          err,
          `Updating calendar for ${calendar[CALENDAR_DATA.CALENDAR_ID]}`
        );
      }
    }
  });
};
