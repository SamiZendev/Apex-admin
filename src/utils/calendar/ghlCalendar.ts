import {
  CALENDAR_DATA,
  CALENDAR_OPEN_HOURS,
  GHL_ACCOUNT_DETAILS,
} from "../../constants/tableAttributes";
import { ACCOUNT_SOURCE, SUPABASE_TABLE_NAME } from "../constant";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { AccountDetails, BookedSlots, Calendar } from "../../types/interfaces";
import { isOverlapping } from "./filter";
import { retrieveAccessToken } from "../helpers";
import { supabase } from "../../services/supabaseClient";
import {
  createGhlAppointment,
  createGhlContact,
} from "../../controllers/ghlController";
import { logger } from "../logger";

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
            slot?.end_time,
          );
        });
        
        logger.info({
          message: "Checking member availability GHL",
          userId: member.user_id,
          isBusy,
          requestedStart,
          requestedEnd,
          bookedSlots: memberBookings?.length || 0,
          calendarId: calendar[CALENDAR_DATA.CALENDAR_ID],
          locationId: calendar[CALENDAR_DATA.GHL_LOCATION_ID],
        })
        
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

export const GhlAppointmentBooking = async (data: {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  startTime: string;
  endTime: string;
  locationId: string;
  utmParams: any;
}) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      startTime,
      endTime,
      locationId,
      utmParams,
    } = data;
    const access_token = await retrieveAccessToken(locationId);
    const { data: subaccountData, error } = await supabase
      .from(SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS)
      .select(
        `*,${SUPABASE_TABLE_NAME.CALENDAR_DATA}(*),${SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE}(*)`
      )
      .eq(GHL_ACCOUNT_DETAILS.GHL_ID, locationId);

    if (error || !subaccountData) {
      return {
        success: false,
        message: "Subaccount not found",
      };
    }

    const contact = await createGhlContact(
      {
        firstName: firstName,
        lastName: lastName || "",
        email: email,
        phone: phoneNumber,
        locationId: locationId,
        source: process.env.GHL_APP_NAME as string,
        customFields: [
          {
            id: subaccountData[0]?.[GHL_ACCOUNT_DETAILS.GHL_CUSTOM_FIELD_ID],
            value: JSON.stringify(utmParams),
          },
        ],
      },
      access_token
    );

    if (!contact) {
      return {
        success: false,
        message: "Contact was not created",
        contact,
      };
    }

    const appointment = await createGhlAppointment(
      {
        calendarId: subaccountData[0]?.[GHL_ACCOUNT_DETAILS.GHL_CALENDAR_ID],
        locationId: locationId,
        contactId: contact?.id,
        startTime: dayjs(startTime)
          .tz(subaccountData[0]?.[GHL_ACCOUNT_DETAILS.GHL_LOCATION_TIMEZONE])
          .format(),
        endTime: dayjs(endTime)
          .tz(subaccountData[0]?.[GHL_ACCOUNT_DETAILS.GHL_LOCATION_TIMEZONE])
          .format(),
      },
      access_token
    );

    if (appointment.success) {
      return {
        success: true,
        redirectURL: subaccountData[0]?.[GHL_ACCOUNT_DETAILS.REDIRECT_URL],
      };
    }

    return {
      success: false,
      calendarId: subaccountData[0]?.[GHL_ACCOUNT_DETAILS.GHL_CALENDAR_ID],
      locationId: locationId,
    };
  } catch (error) {}
};
