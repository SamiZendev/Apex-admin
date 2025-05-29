import { bookOnceHubSlot } from "../../controllers/onceHub/controller";
import {
  CALENDAR_DATA,
  GHL_ACCOUNT_DETAILS,
} from "../../constants/tableAttributes";
import { AccountDetails, BookedSlots, Calendar } from "../../types/interfaces";
import { ACCOUNT_SOURCE, SUPABASE_TABLE_NAME } from "../constant";
import { retrieveAccessToken } from "../helpers";
import { isOverlapping } from "./filter";
import { supabase } from "../../services/supabaseClient";

export function filterAvailableOncehubCalendars(
  calendars: Calendar[],
  bookedSlots: BookedSlots[],
  requestedStart: number,
  requestedEnd: number
): Calendar[] {
  return calendars
    .filter((calendar) =>
      calendar.ghl_account_details?.some(
        (account: AccountDetails) =>
          account.ghl_subaccount_auth?.source === ACCOUNT_SOURCE.ONCEHUB
      )
    )
    .map((calendar) => {
      const teamMemberId = calendar[CALENDAR_DATA.GHL_LOCATION_ID];

      const memberBookings = bookedSlots?.filter(
        (slot) => slot?.ghl_assigned_user_id === teamMemberId
      );

      const isBusy = memberBookings?.some((slot) =>
        isOverlapping(
          requestedStart,
          requestedEnd,
          slot?.start_time,
          slot?.end_time
        )
      );

      return isBusy ? null : calendar;
    })
    .filter((calendar): calendar is Calendar => calendar !== null);
}

export const OnceHubAppointmentBooking = async (data: {
  firstName: string;
  lastName: string;
  email: string;
  startTime: string;
  locationId: string;
  timezone: string;
}) => {
  try {
    const { firstName, lastName, email, startTime, locationId, timezone } =
      data;
    const apiKey = await retrieveAccessToken(locationId);
    const { data: subaccountData, error } = await supabase
      .from(SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS)
      .select("*")
      .eq(GHL_ACCOUNT_DETAILS.GHL_ID, locationId);

    if (error || !subaccountData) {
      return {
        success: false,
        message: "Subaccount not found",
      };
    }

    const appointment = await bookOnceHubSlot(
      subaccountData[0]?.[GHL_ACCOUNT_DETAILS.GHL_CALENDAR_ID],
      apiKey,
      timezone,
      startTime,
      {
        name: `${firstName} ${lastName}`,
        email: email,
      }
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
