import {
  CALENDAR_DATA,
  GHL_SUBACCOUNT_AUTH_ATTRIBUTES,
} from "../constants/tableAttributes";
import { getEventTypeAvailableTimes } from "../controllers/calendly/controller";
import { fetchCalendarAvailableSlots } from "../controllers/ghlController";
import { getAvailableTimeSlotsForBookingCalendar } from "../controllers/onceHub/controller";
import { supabase } from "../services/supabaseClient";
import { ACCOUNT_SOURCE, SUPABASE_TABLE_NAME } from "../utils/constant";
import { logger } from "../utils/logger";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import cron from "node-cron";

dayjs.extend(utc);

export const prefetchCalendarSlots = () => {
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        const today = dayjs.utc().startOf("day");
        let day = today;

        const dateRange: dayjs.Dayjs[] = [];

        while (dateRange.length < 4) {
          if (day.day() !== 0 && day.day() !== 6) {
            dateRange.push(day);
          }
          day = day.add(1, "day");
        }

        const { data: calendars, error } = await supabase
          .from(SUPABASE_TABLE_NAME.CALENDAR_DATA)
          .select(
            `*,${SUPABASE_TABLE_NAME.CALENDAR_TEAM_MEMBERS}(*),${SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS}(
          *,${SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE}(*)
        )`
          )
          .eq(CALENDAR_DATA.IS_ACTIVE, true);

        if (error || !calendars) {
          throw new Error("Unable to fetch calendar data");
        }

        for (const calendar of calendars) {
          const calendarId = calendar[CALENDAR_DATA.CALENDAR_ID];
          const locationId = calendar[CALENDAR_DATA.GHL_LOCATION_ID];
          const subaccountAuth =
            calendar[SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS]?.[0]?.[
              SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE
            ];
          const source =
            subaccountAuth?.[GHL_SUBACCOUNT_AUTH_ATTRIBUTES.SOURCE];

          const startTime = dayjs.utc().toISOString();

          const endTime = dateRange[dateRange.length - 1]
            .endOf("day")
            .toISOString();

          let slots: {
            [date: string]: {
              slots: {
                start_time: string;
                scheduling_url?: string;
              }[];
            };
          } = {};

          try {
            if (source === ACCOUNT_SOURCE.GHL) {
              const availability = await fetchCalendarAvailableSlots(
                calendarId,
                locationId,
                dayjs(startTime).valueOf(),
                dayjs(endTime).valueOf(),
                "GMT"
              );
              slots = availability?.data || {};
            }

            if (source === ACCOUNT_SOURCE.CALENDLY) {
              const calendlyStartTime = dayjs
                .utc()
                .add(2, "minute")
                .second(0)
                .millisecond(0)
                .toISOString();
              const availability = await getEventTypeAvailableTimes(
                calendarId,
                locationId,
                calendlyStartTime,
                endTime
              );

              const collection = availability?.data?.collection || [];
              collection.forEach((slot: any) => {
                const slotDate = dayjs
                  .utc(slot.start_time)
                  .format("YYYY-MM-DD");
                if (!slots[slotDate]) {
                  slots[slotDate] = {
                    slots: [],
                  };
                }
                slots[slotDate].slots.push({
                  start_time: slot.start_time,
                  scheduling_url: slot.scheduling_url,
                });
              });
            }

            if (source === ACCOUNT_SOURCE.ONCEHUB) {
              const availability =
                await getAvailableTimeSlotsForBookingCalendar(
                  calendarId,
                  locationId,
                  startTime,
                  endTime
                );

              (availability?.data || []).forEach((slot: any) => {
                const slotDate = dayjs
                  .utc(slot.start_time)
                  .format("YYYY-MM-DD");
                if (!slots[slotDate]) {
                  slots[slotDate] = {
                    slots: [],
                  };
                }
                slots[slotDate].slots.push(slot.start_time);
              });
            }

            const rowsToInsert: any = [];
            for (const [date, value] of Object.entries(slots)) {
              if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                continue;
              }

              const dateSlots = value?.slots;
              if (!Array.isArray(dateSlots)) {
                continue;
              }

              for (const slot of dateSlots) {
                const slotTime =
                  typeof slot === "string" ? slot : slot.start_time;

                if (!dayjs(slotTime).isValid()) continue;

                const slotDatetime = dayjs.utc(slotTime).toISOString();

                rowsToInsert.push({
                  calendar_id: calendarId,
                  location_id: locationId,
                  slot_datetime_utc: slotDatetime,
                  timezone: "GMT",
                  date,
                  scheduling_url: slot.scheduling_url ?? null,
                });
              }
            }
            if (rowsToInsert.length > 0) {
              const { data, error } = await supabase
                .from(SUPABASE_TABLE_NAME.CALENDAR_SLOTS)
                .insert(rowsToInsert)
                .select();

              if (error) {
                logger.error({
                  message: "Error inserting calendar slots",
                  calendarId,
                  error,
                });
                throw error;
              }
            }
          } catch (innerError) {
            logger.error({
              message: "Error fetching/upserting slots",
              calendarId,
              error: innerError,
            });
          }
        }

        logger.info("Slot prefetching completed successfully.");
      } catch (err) {
        logger.error("Error in prefetchCalendarSlots", err);
      }
    },
    {
      timezone: "UTC",
    }
  );
};
