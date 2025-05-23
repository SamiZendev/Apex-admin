import { CALENDAR_OPEN_HOURS } from "../../constants/tableAttributes";
import { ACCOUNT_SOURCE, SUPABASE_TABLE_NAME } from "../constant";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { AccountDetails, BookedSlots, Calendar } from "../../types/interfaces";
import { isOverlapping } from "./filter";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

export function openGhlCalendar(
  calendars: any[],
  userStartUTC: dayjs.Dayjs,
  userEndUTC: dayjs.Dayjs,
  selectedDay: number
) {
  return calendars?.filter((calendar) => {
    const openHours = calendar[SUPABASE_TABLE_NAME.CALENDAR_OPEN_HOURS];

    const todaysOpenings = openHours.filter((entry: any) => {
      return entry[CALENDAR_OPEN_HOURS.DAY_OF_THE_WEEK] === selectedDay;
    });

    return todaysOpenings.some((entry: any) => {
      const dateStr = userStartUTC.format("YYYY-MM-DD");

      const openTimeUTC = dayjs
        .utc(`${dateStr}T00:00:00Z`)
        .set("hour", entry[CALENDAR_OPEN_HOURS.OPEN_HOUR])
        .set("minute", entry[CALENDAR_OPEN_HOURS.OPEN_MINUTE]);

      let closeTimeUTC = dayjs
        .utc(`${dateStr}T00:00:00Z`)
        .set("hour", entry[CALENDAR_OPEN_HOURS.CLOSE_HOUR])
        .set("minute", entry[CALENDAR_OPEN_HOURS.CLOSE_MINUTE]);

      if (
        entry[CALENDAR_OPEN_HOURS.CLOSE_HOUR] === 0 &&
        entry[CALENDAR_OPEN_HOURS.CLOSE_MINUTE] === 0
      ) {
        closeTimeUTC = closeTimeUTC.add(1, "day");
      }

      return (
        userStartUTC.isSameOrAfter(openTimeUTC) &&
        userEndUTC.isSameOrBefore(closeTimeUTC)
      );
    });
  });
}

export function filterAvailableGhlCalendars(
  calendars: Calendar[],
  bookedSlots: BookedSlots[],
  requestedStart: number,
  requestedEnd: number
): Calendar[] {
  return calendars
    .filter((calendar) =>
      calendar.ghl_account_details?.some(
        (account: AccountDetails) =>
          account.ghl_subaccount_auth?.source === ACCOUNT_SOURCE.GHL
      )
    )
    .map((calendar) => {
      const teamMembers = calendar.calendar_team_members || [];

      if (teamMembers.length === 0) {
        return calendar;
      }

      const availableMembers = teamMembers.filter((member) => {
        const memberBookings = bookedSlots?.filter(
          (slot) => slot?.ghl_assigned_user_id === member.user_id
        );

        const isBusy = memberBookings?.some((slot) => {
          isOverlapping(
            requestedStart,
            requestedEnd,
            slot?.start_time,
            slot?.end_time
          );
        });

        return !isBusy;
      });

      if (availableMembers?.length > 0) {
        return {
          ...calendar,
          calendar_team_members: availableMembers,
        };
      }

      return null;
    })
    .filter((calendar): calendar is Calendar => calendar !== null);
}
