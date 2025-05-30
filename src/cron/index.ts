import { fetchAndSaveOncehubCalendarInformation } from "../controllers/onceHub/controller";
import {
  GHL_ACCOUNT_DETAILS,
  GHL_SUBACCOUNT_AUTH_ATTRIBUTES,
} from "../constants/tableAttributes";
import { fetchAndSaveCalendarInformation } from "../controllers/ghlController";
import { supabase } from "../services/supabaseClient";
import { ACCOUNT_SOURCE, SUPABASE_TABLE_NAME } from "../utils/constant";
import { logErrorToFile } from "../utils/logger";
import cron from "node-cron";

export const updateCalendarConfiguration = () => {
  cron.schedule("0 0 * * *", async () => {
    logErrorToFile("Updating calendar data");
    const { data: account_data, error } = await supabase
      .from(SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS)
      .select(`*,${SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE}(*)`);

    if (error) {
      logErrorToFile(error, "Fetching calendar data");
      return;
    }

    if (!account_data) {
      logErrorToFile(
        new Error("No calendar data found"),
        "Calendar data check"
      );
      return;
    }

    for (const account of account_data) {
      try {
        if (
          account[SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE]?.[
            GHL_SUBACCOUNT_AUTH_ATTRIBUTES.SOURCE
          ] === ACCOUNT_SOURCE.GHL
        ) {
          await fetchAndSaveCalendarInformation(
            account[GHL_ACCOUNT_DETAILS.GHL_CALENDAR_ID],
            account[GHL_ACCOUNT_DETAILS.GHL_ID]
          );
        } else if (
          account[SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE]?.[
            GHL_SUBACCOUNT_AUTH_ATTRIBUTES.SOURCE
          ] === ACCOUNT_SOURCE.ONCEHUB
        ) {
          await fetchAndSaveOncehubCalendarInformation(
            account[GHL_ACCOUNT_DETAILS.GHL_CALENDAR_ID],
            account[GHL_ACCOUNT_DETAILS.GHL_ID]
          );
        }
      } catch (err) {
        logErrorToFile(
          err,
          `Updating calendar for ${
            account[GHL_ACCOUNT_DETAILS.GHL_CALENDAR_ID]
          }`
        );
      }
    }
  });
};
