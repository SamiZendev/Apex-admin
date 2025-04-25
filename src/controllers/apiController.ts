import { SUPABASE_TABLE_NAME } from "../utils/constant";
import {
  CALENDAR_BOOKED_SLOTS,
  CALENDAR_DATA,
  CALENDAR_OPEN_HOURS,
  GHL_ACCOUNT_DETAILS,
} from "./../constants/tableAttributes";
import { Request, Response } from "express";
import {
  insertData,
  matchByString,
  supabase,
  updateData,
} from "../services/supabaseClient";
import z from "zod";
import {
  createGhlAppointment,
  createGhlContact,
  fetchAndSaveCalendarBookedSlot,
  fetchAndSaveCalendarInformation,
} from "./ghlController";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { BookedSlots, Calendar } from "../types/interfaces";
import { retrieveAccessToken } from "../utils/helpers";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

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
      [GHL_ACCOUNT_DETAILS.PRIORITY_SCORE]: z.string(),
      [GHL_ACCOUNT_DETAILS.PHONE]: z.string().optional(),
      [GHL_ACCOUNT_DETAILS.NAME]: z.string().optional(),
      [GHL_ACCOUNT_DETAILS.EMAIL]: z.string().email().optional(),
      [GHL_ACCOUNT_DETAILS.REDIRECT_URL]: z.string().url(),
    });

    const validatedData = updateSchema.parse(req.body);
    const { ghl_id, ...updateFields } = validatedData;
    if (Object.keys(updateFields).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update" });
    }

    const calendar = await fetchAndSaveCalendarInformation(
      validatedData?.[GHL_ACCOUNT_DETAILS.GHL_CALENDAR_ID],
      ghl_id
    );

    const calendarEvents = await fetchAndSaveCalendarBookedSlot(
      validatedData?.[GHL_ACCOUNT_DETAILS.GHL_CALENDAR_ID],
      ghl_id
    );

    if (
      calendar?.success &&
      "responseData" in calendar &&
      Array.isArray(calendar.responseData) &&
      calendar.responseData.length > 0
    ) {
      const response = await updateData(
        SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS,
        {
          ...updateFields,
          [GHL_ACCOUNT_DETAILS.CALENDAR_ID]: calendar?.responseData[0]?.id,
        },
        GHL_ACCOUNT_DETAILS.GHL_ID,
        ghl_id
      );

      return res.status(200).json({
        success: true,
        message: "Data updated successfully",
        data: {
          userData: { ...response },
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

export const getListOfAllSubaccountByCompanyId = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.query;
    const { data, error } = await supabase
      .from(SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS)
      .select("*")
      .eq(GHL_ACCOUNT_DETAILS.GHL_COMPANY_ID, id);

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

export const bookAppointment = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, startTime, endTime } = req.body;
    if (!startTime || !endTime || !firstName || !email) {
      return res.status(400).json({
        message:
          "Missing one of the required fields: startTime, endTime, firstName, and email.",
      });
    }
    const currentUtcTimestamp = Math.floor(Date.now() / 1000);

    const userStartUTC = dayjs(startTime).utc();
    const userEndUTC = dayjs(endTime).utc();
    const selectedDay = userStartUTC.day();

    const startUnix = dayjs(startTime).unix();
    const endUnix = dayjs(endTime).unix();

    if (Number(startUnix) <= currentUtcTimestamp) {
      return res
        .status(400)
        .json({ message: "Booking time must be in the future" });
    }

    if (Number(endUnix) <= Number(startUnix)) {
      return res
        .status(400)
        .json({ message: "End time must be after start time" });
    }

    const bookingDuration = endUnix - startUnix;
    const { data: calendars, error } = await supabase
      .from(SUPABASE_TABLE_NAME.CALENDAR_DATA)
      .select(
        `*,${SUPABASE_TABLE_NAME.CALENDAR_OPEN_HOURS}(*),${SUPABASE_TABLE_NAME.CALENDAR_TEAM_MEMBERS}(*),${SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS}(*)`
      )
      .eq(CALENDAR_DATA.SLOT_DURATION, bookingDuration)
      .eq(CALENDAR_DATA.IS_ACTIVE, true);

    if (error || !calendars) {
      return res
        .status(400)
        .json({ success: false, data: { error, calendars } });
    }

    const availableCalendars = calendars?.filter((calendar) => {
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

    let availableCalendarIds = availableCalendars?.map(
      (calendar) => calendar.calendar_id
    );
    const bookedSlots = await getBookedSlots(availableCalendarIds);

    if (!bookedSlots.success || !bookedSlots.data) {
      return res
        .status(400)
        .json({ message: "Unable to fetch booked slots", bookedSlots });
    }

    const filteredCalendars = filterAvailableCalendars(
      availableCalendars,
      bookedSlots.data,
      startTime,
      endTime
    );
    const sortedCalendars = sortCalendars(filteredCalendars);
    const locationId =
      sortedCalendars[0]?.[SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS][0]?.[
        GHL_ACCOUNT_DETAILS.GHL_ID
      ];
    const access_token = await retrieveAccessToken(locationId);
    const locationBasedTimezone =
      sortedCalendars[0]?.[SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS][0]?.[
        GHL_ACCOUNT_DETAILS.GHL_LOCATION_TIMEZONE
      ];

    const contact = await createGhlContact(
      {
        firstName: firstName,
        lastName: lastName || "",
        email: email,
        phone: phone,
        locationId: locationId,
        source: process.env.GHL_APP_NAME as string,
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
        calendarId: sortedCalendars[0]?.[CALENDAR_DATA.CALENDAR_ID],
        locationId: locationId,
        contactId: contact?.id,
        startTime: dayjs(startTime).tz(locationBasedTimezone).format(),
        endTime: dayjs(endTime).tz(locationBasedTimezone).format(),
      },
      access_token
    );

    if (appointment.success) {
      const matchedCalendar = calendars.find(
        (calendar) =>
          calendar[CALENDAR_DATA.CALENDAR_ID] === appointment?.data?.calendarId
      );

      await insertData(SUPABASE_TABLE_NAME.CALENDAR_BOOKED_SLOTS, {
        [CALENDAR_BOOKED_SLOTS.APPOINTMNET_STATUS]:
          appointment?.data?.appoinmentStatus,
        [CALENDAR_BOOKED_SLOTS.GHL_EVENT_ID]: appointment?.data?.id,
        [CALENDAR_BOOKED_SLOTS.GHL_ASSIGNED_USER_ID]:
          appointment?.data?.assignedUserId,
        [CALENDAR_BOOKED_SLOTS.GHL_CALENDAR_ID]: appointment?.data?.calendarId,
        [CALENDAR_BOOKED_SLOTS.GHL_CONTACT_ID]: appointment?.data?.contactId,
        [CALENDAR_BOOKED_SLOTS.START_TIME]: startUnix,
        [CALENDAR_BOOKED_SLOTS.END_TIME]: endUnix,
        [CALENDAR_BOOKED_SLOTS.GHL_LOCATION_ID]: locationId,
      });

      return res.status(200).json({
        success: true,
        redirectURL:
          matchedCalendar[SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS][0]?.[
            GHL_ACCOUNT_DETAILS.REDIRECT_URL
          ],
      });
    }

    return res.status(400).json({
      success: false,
      calendarId: sortedCalendars[0]?.[CALENDAR_DATA.CALENDAR_ID],
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

const getBookedSlots = async (
  ghlCalendarIds: string[]
): Promise<{ success: boolean; data?: BookedSlots[]; error?: any }> => {
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLE_NAME.CALENDAR_BOOKED_SLOTS)
      .select()
      .in(CALENDAR_BOOKED_SLOTS.GHL_CALENDAR_ID, ghlCalendarIds);
    if (error) {
      throw error;
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.log("Error occured while fetching booked slots");
    return {
      success: false,
      error,
    };
  }
};

const isOverlapping = (
  requestedStartTime: number,
  requestedEndTime: number,
  bookedStartTime: number,
  bookedEndTime: number
) => requestedStartTime < bookedEndTime && bookedStartTime < requestedEndTime;

const filterAvailableCalendars = (
  calendars: Calendar[],
  bookedSlots: BookedSlots[],
  requestedStart: number,
  requestedEnd: number
): Calendar[] => {
  return calendars
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
};

const sortCalendars = (calendars: any[]) => {
  return calendars.sort((a, b) => {
    const bookedSlotsA = a.booked_slots ? a.booked_slots : 0;
    const bookedSlotsB = b.booked_slots ? b.booked_slots : 0;

    if (bookedSlotsA !== bookedSlotsB) {
      return bookedSlotsA - bookedSlotsB;
    }

    const priorityA = parseInt(
      a.ghl_account_details?.[0]?.priority_score || "0",
      10
    );
    const priorityB = parseInt(
      b.ghl_account_details?.[0]?.priority_score || "0",
      10
    );

    if (priorityA !== priorityB) {
      return priorityB - priorityA;
    }

    const spendA = parseFloat(a.ghl_account_details?.[0]?.spend_amount || "0");
    const spendB = parseFloat(b.ghl_account_details?.[0]?.spend_amount || "0");

    return spendB - spendA;
  });
};
