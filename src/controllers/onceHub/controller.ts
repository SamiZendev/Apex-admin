import { convertToSeconds, retrieveAccessToken } from "../../utils/helpers";
import {
  insertData,
  matchByString,
  supabase,
  updateData,
} from "../../services/supabaseClient";
import { SUPABASE_TABLE_NAME } from "../../utils/constant";
import axios from "axios";
import { Request, Response } from "express";
import {
  CALENDAR_BOOKED_SLOTS,
  CALENDAR_DATA,
  CALENDAR_TEAM_MEMBERS,
} from "../../constants/tableAttributes";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import duration from "dayjs/plugin/duration";

dayjs.extend(utc);
dayjs.extend(duration);

export const getListOfAllUsers = async (apiKey: string) => {
  try {
    if (!apiKey) {
      return { success: false, error: "Missing apiKey in body" };
    }

    const response = await axios.get(
      `${process.env.ONCEHUB_API_BASE_URL}/users?limit=100`,
      {
        headers: {
          Accept: "application/json",
          "API-Key": apiKey,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error(
      "Error fetching oncehub account details:",
      error?.response?.data || error.message
    );
    return {
      error: "Failed to fetch oncehub account details",
      details: error?.response?.data || error.message,
    };
  }
};

export const getUserById = async (apiKey: string, userId: string) => {
  try {
    if (!apiKey) {
      return { success: false, error: "Missing apiKey in body" };
    }

    const response = await axios.get(
      `${process.env.ONCEHUB_API_BASE_URL}/users/${userId}`,
      {
        headers: {
          Accept: "application/json",
          "API-Key": apiKey,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error(
      "Error fetching oncehub user details:",
      error?.response?.data || error.message
    );
    return {
      error: "Failed to fetch oncehub user details",
      details: error?.response?.data || error.message,
    };
  }
};

export const getListOfAllCalendars = async (req: Request, res: Response) => {
  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        success: false,
        message: "Missing or invalid 'id' query parameter.",
      });
    }

    const apiKey = await retrieveAccessToken(id as string);
    const response = await axios.get(
      `${process.env.ONCEHUB_API_BASE_URL}/booking-calendars?limit=100`,
      {
        headers: {
          "API-Key": apiKey,
          Accept: "application/json",
        },
      }
    );

    const calendars = response.data.data.map(
      (item: { id: string; name: string }) => ({
        id: item.id,
        name: item.name,
      })
    );

    return res.status(200).json({
      success: true,
      message: "Calendars fetched successfully",
      data: calendars,
    });
  } catch (error: any) {
    console.error("OnceHub API error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch calendars from OnceHub",
      details: error.response?.data || error.message,
    });
  }
};

export const fetchAndSaveOncehubCalendarInformation = async (
  calendarId: string,
  userId: string
) => {
  try {
    const apiKey = await retrieveAccessToken(userId);
    const response = await axios.get(
      `${process.env.ONCEHUB_API_BASE_URL}/booking-calendars/${calendarId}`,
      {
        headers: {
          "API-Key": apiKey,
          Accept: "application/json",
        },
      }
    );
    const calendar = response?.data;
    if (!calendar) {
      return { success: false, message: "Calendar data not found" };
    }

    const calendarData = {
      [CALENDAR_DATA.NAME]: calendar?.name,
      [CALENDAR_DATA.CALENDAR_ID]: calendarId,
      [CALENDAR_DATA.IS_ACTIVE]: calendar?.published || true,
      [CALENDAR_DATA.SLUG]: calendar?.url,
      [CALENDAR_DATA.GHL_LOCATION_ID]: userId,
      [CALENDAR_DATA.SLOT_DURATION]: convertToSeconds(
        calendar?.duration_minutes || 30,
        "mins"
      ),
    };

    const existingCalendar = await matchByString(
      SUPABASE_TABLE_NAME.CALENDAR_DATA,
      CALENDAR_DATA.CALENDAR_ID,
      calendarId
    );

    let insertedCalendarData;

    if (
      Array.isArray(existingCalendar) &&
      Object.keys(existingCalendar).length > 0
    ) {
      insertedCalendarData = await updateData(
        SUPABASE_TABLE_NAME.CALENDAR_DATA,
        calendarData,
        CALENDAR_DATA.CALENDAR_ID,
        calendarId
      );
    } else {
      insertedCalendarData = await insertData(
        SUPABASE_TABLE_NAME.CALENDAR_DATA,
        calendarData
      );
    }

    const savedCalendarId = insertedCalendarData?.responseData?.[0]?.id;
    await saveTeamMembersToDB(apiKey, userId, savedCalendarId, calendarId);
    if (!insertedCalendarData?.success || !savedCalendarId) {
      return { success: false, message: "Failed to save calendar data" };
    }

    return { ...insertedCalendarData };
  } catch (error: any) {
    console.error("Calendly API error:", error.response?.data || error.message);
    return {
      error: "Failed to fetch Calendly event types",
      details: error?.response?.data || error.message,
    };
  }
};

async function saveTeamMembersToDB(
  apiKey: string,
  userId: string,
  calendarUuid: string,
  calendarId: string
) {
  try {
    const user = await getUserById(apiKey, userId);
    if (!user?.id) {
      throw new Error("User not found or invalid user ID");
    }

    const dataToSave = {
      [CALENDAR_TEAM_MEMBERS.CALENDAR_ID]: calendarUuid,
      [CALENDAR_TEAM_MEMBERS.USER_ID]: user.id,
      [CALENDAR_TEAM_MEMBERS.GHL_CALENDAR_ID]: calendarId,
    };

    const { data: existingMember, error: fetchError } = await supabase
      .from(SUPABASE_TABLE_NAME.CALENDAR_TEAM_MEMBERS)
      .select()
      .eq(CALENDAR_TEAM_MEMBERS.CALENDAR_ID, calendarUuid)
      .eq(CALENDAR_TEAM_MEMBERS.USER_ID, user.id)
      .limit(1)
      .single();

    let result;

    if (!fetchError && existingMember) {
      result = await updateData(
        SUPABASE_TABLE_NAME.CALENDAR_TEAM_MEMBERS,
        dataToSave,
        CALENDAR_TEAM_MEMBERS.ID,
        existingMember.id
      );
    } else {
      result = await insertData(
        SUPABASE_TABLE_NAME.CALENDAR_TEAM_MEMBERS,
        dataToSave
      );
    }

    if (result?.success) {
      return result.responseData;
    } else {
      throw new Error("Failed to insert or update team member");
    }
  } catch (error: any) {
    console.error("Error saving team members:", error.message);
    return [];
  }
}

export const fetchAndSaveOncehubCalendarBookedSlot = async (
  calendarId: string,
  locationId: string
) => {
  try {
    if (!calendarId || !locationId) {
      return { success: false, error: "Missing calendarId or locationId" };
    }

    const apiKey = await retrieveAccessToken(locationId as string);

    if (!apiKey) {
      return { success: false, message: "Generate Access Token" };
    }

    const response = await axios.get(
      `${process.env.ONCEHUB_API_BASE_URL}/bookings`,
      {
        params: {
          limit: 100,
          booking_calendar: calendarId,
          host: locationId,
        },
        headers: {
          Accept: "application/json",
          "API-Key": `${apiKey}`,
        },
      }
    );

    const calendarEvents = response.data?.data;
    if (!calendarEvents || !calendarEvents.length) {
      return { success: false, message: "Calendar data not found" };
    }
    for (const event of calendarEvents) {
      const eventData = {
        [CALENDAR_BOOKED_SLOTS.APPOINTMNET_STATUS]: event?.status,
        [CALENDAR_BOOKED_SLOTS.GHL_EVENT_ID]: event?.id,
        [CALENDAR_BOOKED_SLOTS.GHL_LOCATION_ID]: event?.owner,
        [CALENDAR_BOOKED_SLOTS.GHL_ASSIGNED_USER_ID]: event?.owner,
        [CALENDAR_BOOKED_SLOTS.GHL_CALENDAR_ID]: event?.booking_calendar,
        [CALENDAR_BOOKED_SLOTS.START_TIME]: dayjs
          .utc(event?.starting_time)
          .unix(),
        [CALENDAR_BOOKED_SLOTS.END_TIME]: dayjs
          .utc(event?.starting_time)
          .add(event.duration_minutes, "minute")
          .unix(),
      };

      try {
        const existingCalendarEvents = await matchByString(
          SUPABASE_TABLE_NAME.CALENDAR_BOOKED_SLOTS,
          CALENDAR_BOOKED_SLOTS.GHL_EVENT_ID,
          event?.id
        );

        let dbOperation;

        if (
          Array.isArray(existingCalendarEvents) &&
          existingCalendarEvents.length > 0
        ) {
          dbOperation = await updateData(
            SUPABASE_TABLE_NAME.CALENDAR_BOOKED_SLOTS,
            eventData,
            CALENDAR_BOOKED_SLOTS.GHL_EVENT_ID,
            event.id
          );
        } else {
          dbOperation = await insertData(
            SUPABASE_TABLE_NAME.CALENDAR_BOOKED_SLOTS,
            eventData
          );
        }
        console.log("Database operation successful:", dbOperation);
      } catch (error) {
        console.error("Error processing event:", event.id, error);
      }
    }

    return { success: true, events: calendarEvents };
  } catch (error: any) {
    console.error("Error fetching calendar booked slots:", error);
    return {
      success: false,
      error: "Failed to fetch calendar booked slots",
      details: error?.response?.data || error.message,
    };
  }
};

export const getAvailableTimeSlotsForBookingCalendar = async (
  calendarId: string,
  userId: string,
  startTime: string,
  endTime: string
) => {
  try {
    const apiKey = await retrieveAccessToken(userId);
    const response = await axios.get(
      `${process.env.ONCEHUB_API_BASE_URL}/booking-calendars/${calendarId}/time-slots`,
      {
        headers: {
          Accept: "application/json",
          "API-Key": `${apiKey}`,
        },
        params: {
          start_time: startTime,
          end_time: endTime,
        },
      }
    );
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error("Oncehub API error:", error.response?.data || error.message);
    return {
      error: "Failed to fetch Oncehub calendar time slots",
      details: error?.response?.data || error.message,
    };
  }
};

export const bookOnceHubSlot = async (
  calendarId: string,
  apiKey: string,
  guest_time_zone: string,
  start_time: string,
  booking_form: {
    name: string;
    email: string;
  }
) => {
  try {
    const response = await axios.post(
      `${process.env.ONCEHUB_API_BASE_URL}//booking-calendars/${calendarId}/schedule`,
      {
        booking_form,
        start_time,
        guest_time_zone,
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "API-Key": `${apiKey}`,
        },
      }
    );

    return { success: true, data: response?.data };
  } catch (error) {
    console.error("Error creating appointment", error);
    return {
      success: false,
      error: "Failed to create appointment",
      details: error,
    };
  }
};
