import { ACCOUNT_SOURCE, SUPABASE_TABLE_NAME } from "../utils/constant";
import {
  CALENDAR_DATA,
  GHL_ACCOUNT_DETAILS,
  GHL_SUBACCOUNT_AUTH_ATTRIBUTES,
  STATES,
} from "./../constants/tableAttributes";
import { Request, Response } from "express";
import { matchByString, supabase } from "../services/supabaseClient";
import z from "zod";
import {
  createGhlAppointment,
  createGhlContact,
  fetchAndSaveCalendarBookedSlot,
  fetchAndSaveCalendarInformation,
  fetchCalendarAvailableSlots,
} from "./ghlController";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { retrieveAccessToken } from "../utils/helpers";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
  fetchAndSaveCalendyCalendarInformation,
  fetchAndSaveCalendyUserBookedSlots,
  getEventTypeAvailableTimes,
} from "./calendly/controller";
import {
  filterAvailableGhlCalendars,
  openGhlCalendar,
} from "../utils/calendar/ghlCalendar";
import {
  checkCalendarByUtmParams,
  getBookedSlots,
  sortCalendars,
} from "../utils/calendar/filter";
import { AccountDetails } from "../types/interfaces";
import { filterAvailableCalendlyCalendars } from "../utils/calendar/calendlyCalendar";
import {
  fetchAndSaveOncehubCalendarBookedSlot,
  fetchAndSaveOncehubCalendarInformation,
} from "./onceHub/controller";

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

export const getDataById = async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    const data = await matchByString(
      SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS,
      GHL_ACCOUNT_DETAILS.GHL_ID,
      id as string
    );

    if (Array.isArray(data) && Object.keys(data).length > 0) {
      return res.status(200).json({ success: true, message: "", data });
    }

    return res
      .status(404)
      .json({ success: false, message: "Data Not Found", data: [] });
  } catch (error: any) {
    console.error(
      "Error fetching data:",
      error?.response?.data || error.message
    );
    return res.status(500).json({
      error: "Failed to fetch data",
      details: error?.response?.data || error.message,
    });
  }
};

export const configureSubaccount = async (req: Request, res: Response) => {
  try {
    const updateSchema = z.object({
      [GHL_ACCOUNT_DETAILS.GHL_ID]: z.string().min(1, "ghl_id is required"),
      [GHL_ACCOUNT_DETAILS.SPEND_AMOUNT]: z.string(),
      [GHL_ACCOUNT_DETAILS.GHL_CALENDAR_ID]: z.string(),
      // [GHL_ACCOUNT_DETAILS.PRIORITY_SCORE]: z.string(),
      [GHL_ACCOUNT_DETAILS.PHONE]: z.string().optional(),
      [GHL_ACCOUNT_DETAILS.STATE]: z.array(z.string()).optional(),
      [GHL_ACCOUNT_DETAILS.ASSEST_MINIMUM]: z.string().optional(),
      [GHL_ACCOUNT_DETAILS.CONDITION]: z.string().optional(),
      [GHL_ACCOUNT_DETAILS.NAME]: z.string().optional(),
      [GHL_ACCOUNT_DETAILS.EMAIL]: z.string().email().optional(),
      [GHL_ACCOUNT_DETAILS.REDIRECT_URL]: z.string().url(),
      ghl_subaccount_auth: z
        .object({
          source: z.string().min(1, "source is required"),
        })
        .optional(),
    });

    const validatedData = updateSchema.parse(req.body);
    const {
      ghl_id,
      ghl_subaccount_auth: { source } = {},
      ...updateFields
    } = validatedData;
    if (Object.keys(updateFields).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update" });
    }

    let calendar, calendarEvents;
    if (source === ACCOUNT_SOURCE.GHL) {
      calendar = await fetchAndSaveCalendarInformation(
        validatedData?.[GHL_ACCOUNT_DETAILS.GHL_CALENDAR_ID],
        ghl_id
      );

      calendarEvents = await fetchAndSaveCalendarBookedSlot(
        validatedData?.[GHL_ACCOUNT_DETAILS.GHL_CALENDAR_ID],
        ghl_id
      );
    } else if (source === ACCOUNT_SOURCE.CALENDLY) {
      calendar = await fetchAndSaveCalendyCalendarInformation(
        validatedData?.[GHL_ACCOUNT_DETAILS.GHL_CALENDAR_ID],
        ghl_id
      );

      calendarEvents = await fetchAndSaveCalendyUserBookedSlots(ghl_id);
    } else if (source === ACCOUNT_SOURCE.ONCEHUB) {
      calendar = await fetchAndSaveOncehubCalendarInformation(
        validatedData?.[GHL_ACCOUNT_DETAILS.GHL_CALENDAR_ID],
        ghl_id
      );
      calendarEvents = await fetchAndSaveOncehubCalendarBookedSlot(
        validatedData?.[GHL_ACCOUNT_DETAILS.GHL_CALENDAR_ID],
        ghl_id
      );
    }

    if (
      calendar?.success &&
      "responseData" in calendar &&
      Array.isArray(calendar.responseData) &&
      calendar.responseData.length > 0
    ) {
      const { data, error } = await supabase
        .from(SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS)
        .update({
          ...updateFields,
          [GHL_ACCOUNT_DETAILS.CALENDAR_ID]: calendar?.responseData[0]?.id,
        })
        .eq(GHL_ACCOUNT_DETAILS.GHL_ID, ghl_id)
        .select(`*,${SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE}(*)`);

      return res.status(200).json({
        success: true,
        message: "Data updated successfully",
        data: {
          userData: { ...data },
          calendarData: { ...calendar },
        },
      });
    }

    return res
      .status(500)
      .json({ success: false, message: "Database update failed", calendar });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: error.errors,
      });
    }
    return res
      .status(500)
      .json({ success: false, message: "Internal server error", error: error });
  }
};

export const getListOfAllAccounts = async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    const { data, error } = await supabase
      .from(SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS)
      .select(`*,${SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE}(*)`);

    if (error) {
      return res
        .status(404)
        .json({ success: false, message: "Company Not Found", data: data });
    }
    return res.status(200).json({ success: true, message: "", data });
  } catch (error: any) {
    console.error(
      "Error fetching data:",
      error?.response?.data || error.message
    );
    return res.status(500).json({
      error: "Failed to fetch data",
      details: error?.response?.data || error.message,
    });
  }
};

export const getCalendarAndSubaccountByBookingAppointmentDetails = async (
  req: Request,
  res: Response
) => {
  try {
    const { startTime, endTime, utmParams } = req.body;
    if (!startTime || !endTime) {
      return res.status(400).json({
        message: "Missing one of the required fields: startTime, endTime",
      });
    }
    const userStartUTC = dayjs(startTime).utc();
    const userEndUTC = dayjs(endTime).utc();
    const selectedDay = userStartUTC.day();
    const startUnix = dayjs(startTime).unix();
    const endUnix = dayjs(endTime).unix();
    const startDateMillis = dayjs.utc(userStartUTC).valueOf();
    const endDateMillis = dayjs.utc(userEndUTC).valueOf();
    const bookingDate = dayjs(startTime).format("YYYY-MM-DD");
    const { state: utmState, ...utmRest } = utmParams;
    const shouldCheckState =
      utmState && utmState.trim().toUpperCase() !== "ALL";

    let matchedStateIds: string[] = [];

    if (shouldCheckState) {
      const { data: matchedStates, error: stateError } = await supabase
        .from(SUPABASE_TABLE_NAME.STATES)
        .select("*")
        .or(
          `${[STATES.STATE]}.ilike.${utmState},${[
            STATES.STATE_ABBREVIATION,
          ]}.ilike.${utmState}`
        );

      if (stateError) {
        return res.status(400).json({
          success: false,
          message: "Error fetching state data",
          error: stateError,
        });
      }

      matchedStateIds = matchedStates?.map((s) => s.id) || [];
    }

    const bookingDuration = endUnix - startUnix;
    const { data: calendars, error } = await supabase
      .from(SUPABASE_TABLE_NAME.CALENDAR_DATA)
      .select(
        `*,${SUPABASE_TABLE_NAME.CALENDAR_OPEN_HOURS}(*),${SUPABASE_TABLE_NAME.CALENDAR_TEAM_MEMBERS}(*),${SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS}(
       *,
       ${SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE}(*)
     )`
      )
      .eq(CALENDAR_DATA.SLOT_DURATION, bookingDuration)
      .eq(CALENDAR_DATA.IS_ACTIVE, true);

    if (error || !calendars) {
      return res
        .status(400)
        .json({ success: false, data: { error, calendars } });
    }

    const calendlyCalendars = calendars.filter((calendar) =>
      calendar.ghl_account_details?.some(
        (account: AccountDetails) =>
          account.ghl_subaccount_auth?.source === ACCOUNT_SOURCE.CALENDLY
      )
    );

    const ghlCalendars = calendars.filter((calendar) =>
      calendar.ghl_account_details?.some(
        (account: AccountDetails) =>
          account.ghl_subaccount_auth?.source === ACCOUNT_SOURCE.GHL
      )
    );

    const availableGhlCalendars = openGhlCalendar(
      ghlCalendars,
      userStartUTC,
      userEndUTC,
      selectedDay
    );

    const combinedCalendars = [...calendlyCalendars, ...availableGhlCalendars];

    const eligibleCalendars = await checkCalendarByUtmParams(
      combinedCalendars,
      utmParams,
      matchedStateIds,
      shouldCheckState
    );

    let availableCalendarIds = eligibleCalendars?.map(
      (calendar) => calendar.calendar_id
    );

    const bookedSlots = await getBookedSlots(availableCalendarIds);

    if (!bookedSlots.success || !bookedSlots.data) {
      return res
        .status(400)
        .json({ message: "Unable to fetch booked slots", bookedSlots });
    }

    const filteredGHLCalendars = filterAvailableGhlCalendars(
      eligibleCalendars,
      bookedSlots.data,
      startTime,
      endTime
    );

    const filteredCalendlyCalendars = filterAvailableCalendlyCalendars(
      eligibleCalendars,
      bookedSlots.data,
      startTime,
      endTime
    );

    const filteredCalendars = [
      ...filteredCalendlyCalendars,
      ...filteredGHLCalendars,
    ];
    const sortedCalendars = sortCalendars(filteredCalendars);

    const calendarsWithSlot = await Promise.all(
      sortedCalendars.map(async (calendar) => {
        const source =
          calendar[SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS][0][
            SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE
          ][GHL_SUBACCOUNT_AUTH_ATTRIBUTES.SOURCE];
        if (source === ACCOUNT_SOURCE.GHL) {
          const slotAvailability = await fetchCalendarAvailableSlots(
            calendar[CALENDAR_DATA.CALENDAR_ID],
            calendar[CALENDAR_DATA.GHL_LOCATION_ID],
            startDateMillis,
            endDateMillis,
            "GMT"
          );

          if (slotAvailability?.success && slotAvailability?.data) {
            const slots = slotAvailability.data?.[bookingDate]?.slots || [];
            if (
              slots.includes(userStartUTC.toISOString().replace(".000", ""))
            ) {
              return calendar;
            }
          }
        } else if (source === ACCOUNT_SOURCE.CALENDLY) {
          const slotAvailability = await getEventTypeAvailableTimes(
            calendar[CALENDAR_DATA.CALENDAR_ID],
            calendar[CALENDAR_DATA.GHL_LOCATION_ID],
            userStartUTC.toISOString(),
            userEndUTC.toISOString()
          );
          if (slotAvailability?.success && slotAvailability?.data) {
            const slots = slotAvailability.data?.collection;
            const requestedTime = userStartUTC
              .toISOString()
              .replace(".000", "");
            const matchingSlot = slots?.find(
              (slot: { start_time: string }) =>
                slot.start_time === requestedTime
            );

            if (matchingSlot) {
              return {
                ...calendar,
                matched_slot: matchingSlot,
              };
            }
          }
        }
        return null;
      })
    );
    const calendarSlots = sortCalendars(calendarsWithSlot.filter(Boolean));

    return res.status(200).json({
      success: true,
      message: "Calendars fetched successfully",
      calendar: calendarSlots[0],
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    return res.status(500).json({
      success: false,
      error,
    });
  }
};

export const bookAppointment = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      startTime,
      endTime,
      locationId,
      utmParams,
    } = req.body;
    if (!startTime || !endTime || !firstName || !email || !locationId) {
      return res.status(400).json({
        message:
          "Missing one of the required fields: startTime, endTime, firstName and email.",
      });
    }
    const access_token = await retrieveAccessToken(locationId);
    const { data: subaccountData, error } = await supabase
      .from(SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS)
      .select(`*,${SUPABASE_TABLE_NAME.CALENDAR_DATA}(*)`)
      .eq(GHL_ACCOUNT_DETAILS.GHL_ID, locationId);

    if (error || !subaccountData) {
      return res.status(404).json({
        success: false,
        message: "Subaccount not found",
      });
    }

    const contact = await createGhlContact(
      {
        firstName: firstName,
        lastName: lastName || "",
        email: email,
        phone: phone,
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
      return res.status(400).json({
        success: false,
        message: "Contact was not created",
        contact,
      });
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
      return res.status(200).json({
        success: true,
        redirectURL: subaccountData[0]?.[GHL_ACCOUNT_DETAILS.REDIRECT_URL],
      });
    }

    return res.status(400).json({
      success: false,
      calendarId: subaccountData[0]?.[GHL_ACCOUNT_DETAILS.GHL_CALENDAR_ID],
      locationId: locationId,
    });
  } catch (error) {}
};

export const getTimezones = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLE_NAME.TIMEZONE)
      .select("timezone");
    if (error) {
      return res
        .status(404)
        .json({ success: false, message: "Company Not Found", data: error });
    }
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching data:", error);
    return res.status(500).json({
      success: false,
      error,
    });
  }
};

export const getStates = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLE_NAME.STATES)
      .select("*");

    if (error) {
      return res.status(404).json({
        success: false,
        message: "States Not Found",
        data: error,
      });
    }

    return res.status(200).json({
      success: true,
      message: "",
      data,
    });
  } catch (error) {
    console.error("Error fetching states:", error);
    return res.status(500).json({
      success: false,
      error,
    });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const [{ error: error1 }, { error: error2 }, { error: error3 }] =
      await Promise.all([
        supabase
          .from(SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS)
          .delete()
          .eq(GHL_ACCOUNT_DETAILS.GHL_ID, id),

        supabase
          .from(SUPABASE_TABLE_NAME.GHL_SUBACCOUNT_AUTH_TABLE)
          .delete()
          .eq(GHL_SUBACCOUNT_AUTH_ATTRIBUTES.GHL_LOCATION_ID, id),

        supabase
          .from(SUPABASE_TABLE_NAME.CALENDAR_DATA)
          .delete()
          .eq(CALENDAR_DATA.GHL_LOCATION_ID, id),
      ]);

    const errors = [error1, error2, error3].filter(Boolean);

    if (errors.length > 0) {
      return res.status(500).json({ errors });
    }

    res.json({ message: "Account and related data deleted successfully." });
  } catch (err) {
    console.error("Unexpected error in deleteAccount:", err);
    res
      .status(500)
      .json({ error: "Unexpected error occurred while deleting the account." });
  }
};
