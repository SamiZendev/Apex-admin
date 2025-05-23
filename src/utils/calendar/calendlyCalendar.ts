import { CALENDAR_DATA } from "../../constants/tableAttributes";
import { AccountDetails, BookedSlots, Calendar } from "../../types/interfaces";
import { ACCOUNT_SOURCE } from "../constant";
import { isOverlapping } from "./filter";

export function filterAvailableCalendlyCalendars(
  calendars: Calendar[],
  bookedSlots: BookedSlots[],
  requestedStart: number,
  requestedEnd: number
): Calendar[] {
  return calendars
    .filter((calendar) =>
      calendar.ghl_account_details?.some(
        (account: AccountDetails) =>
          account.ghl_subaccount_auth?.source === ACCOUNT_SOURCE.CALENDLY
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
