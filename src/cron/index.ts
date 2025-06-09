import { fetchAndSaveOncehubCalendarInformation } from "../controllers/onceHub/controller";
import {
  GHL_ACCOUNT_DETAILS,
  GHL_SUBACCOUNT_AUTH_ATTRIBUTES,
} from "../constants/tableAttributes";
import {
  fetchAndSaveCalendarInformation,
  fetchSubaccountInformation,
} from "../controllers/ghlController";
import { supabase } from "../services/supabaseClient";
import { ACCOUNT_SOURCE, SUPABASE_TABLE_NAME } from "../utils/constant";
import cron from "node-cron";
import { logger } from "../utils/logger";

export const updateCalendarConfiguration = () => {
  cron.schedule("0 0 * * *", async () => {
    logger.info({
      message: "Running daily calendar configuration update",
      timestamp: new Date().toISOString(),
    });
    const { data: account_data, error } = await supabase
      .from(SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS)
      .select(`*,${SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE}(*)`);

    if (error) {
      logger.error({
        message: "Error fetching calendar data",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!account_data) {
      logger.info({
        message: "No calendar data found",
        timestamp: new Date().toISOString(),
      });
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
          const subaccount = await fetchSubaccountInformation(
            account[GHL_ACCOUNT_DETAILS.GHL_ID]
          );
          const accountDetails = {
            [GHL_ACCOUNT_DETAILS.GHL_LOCATION_TIMEZONE]:
              subaccount?.location?.timezone || "UTC",
            [GHL_ACCOUNT_DETAILS.UPDATED_AT]: new Date().toISOString(),
          };
          const { data, error } = await supabase
            .from(SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS)
            .update(accountDetails)
            .eq(GHL_ACCOUNT_DETAILS.GHL_ID, account[GHL_ACCOUNT_DETAILS.GHL_ID])
            .select();
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
        logger.error({
          message: "Error updating calendar configuration",
          error: (err as Error).message,
          accountId: account[GHL_ACCOUNT_DETAILS.GHL_ID],
          timestamp: new Date().toISOString(),
        });
      }
    }
  });
};
