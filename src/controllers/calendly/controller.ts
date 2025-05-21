import { SUPABASE_TABLE_NAME } from "../../utils/constant";
import {
  CALENDAR_BOOKED_SLOTS,
  CALENDAR_DATA,
} from "../../constants/tableAttributes";
import { convertToSeconds, retrieveAccessToken } from "../../utils/helpers";
import axios from "axios";
import { Request, Response } from "express";
import {
  insertData,
  matchByString,
  updateData,
} from "../../services/supabaseClient";
import dayjs from "dayjs";

export const getCurrentUser = async (access_token: string) => {
  try {
    if (!access_token) {
      return { success: false, error: "Missing locationId in body" };
    }

    const response = await axios.get(
      `${process.env.CALENDLY_API_BASE_URL}/users/me`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${access_token}`,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error(
      "Error fetching subaccount details:",
      error?.response?.data || error.message
    );
    return {
      error: "Failed to fetch subaccount details",
      details: error?.response?.data || error.message,
    };
  }
};

export const getEventTypes = async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    const access_token = await retrieveAccessToken(id as string);
    const response = await axios.get(
      `${process.env.CALENDLY_API_BASE_URL}/event_types`,
      {
        params: {
          active: true,
          count: 100,
          user: `${process.env.CALENDLY_API_BASE_URL}/users/${id}`,
        },
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const calendars = response.data.collection.map(
      (item: { uri: string; name: string }) => ({
        id: item.uri.split("/").pop(),
        name: item.name,
      })
    );

    return res
      .status(200)
      .json({ success: true, message: "", data: calendars });
  } catch (error: any) {
    console.error("Calendly API error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to fetch Calendly event types",
      details: error.response?.data || error.message,
    });
  }
};

export const fetchAndSaveCalendyCalendarInformation = async (
  calendarId: string,
  userId: string
) => {
  try {
    const access_token = await retrieveAccessToken(userId);
    const response = await axios.get(
      `${process.env.CALENDLY_API_BASE_URL}/event_types/${calendarId}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${access_token}`,
        },
      }
    );
    const calendar = response?.data?.resource;
    if (!calendar) {
      return { success: false, message: "Calendar data not found" };
    }

    const calendarData = {
      [CALENDAR_DATA.NAME]: calendar?.name,
      [CALENDAR_DATA.CALENDAR_ID]: calendarId,
      [CALENDAR_DATA.SLOT_DURATION]: convertToSeconds(
        calendar?.duration || 0,
        "mins"
      ),
      [CALENDAR_DATA.IS_ACTIVE]: calendar?.active || true,
      [CALENDAR_DATA.SLUG]: calendar?.slug,
      [CALENDAR_DATA.GHL_LOCATION_ID]: userId,
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

export const fetchAndSaveCalendyUserBookedSlots = async (userId: string) => {
  console.log("Fetching booked slots for user:", userId);
  try {
    const access_token = await retrieveAccessToken(userId);
    const response = await axios.get(
      `${process.env.CALENDLY_API_BASE_URL}/scheduled_events`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        params: {
          user: `${process.env.CALENDLY_API_BASE_URL}/users/${userId}`,
          status: "active",
          count: 100,
        },
      }
    );
    const bookedSlots = response?.data?.collection;
    if (!bookedSlots || !bookedSlots.length) {
      return { success: false, message: "No Slots Found" };
    }

    for (const event of bookedSlots) {
      const eventData = {
        [CALENDAR_BOOKED_SLOTS.APPOINTMNET_STATUS]: event?.status,
        [CALENDAR_BOOKED_SLOTS.GHL_EVENT_ID]: event?.uri.split("/").pop(),
        [CALENDAR_BOOKED_SLOTS.GHL_LOCATION_ID]: userId,
        [CALENDAR_BOOKED_SLOTS.GHL_ASSIGNED_USER_ID]: userId,
        [CALENDAR_BOOKED_SLOTS.GHL_CALENDAR_ID]: event?.event_type
          .split("/")
          .pop(),
        [CALENDAR_BOOKED_SLOTS.START_TIME]: dayjs.utc(event?.start_time).unix(),
        [CALENDAR_BOOKED_SLOTS.END_TIME]: dayjs.utc(event?.end_time).unix(),
      };

      try {
        const existingCalendarEvents = await matchByString(
          SUPABASE_TABLE_NAME.CALENDAR_BOOKED_SLOTS,
          CALENDAR_BOOKED_SLOTS.GHL_EVENT_ID,
          event?.uri.split("/").pop()
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
            event?.uri.split("/").pop()
          );
        } else {
          dbOperation = await insertData(
            SUPABASE_TABLE_NAME.CALENDAR_BOOKED_SLOTS,
            eventData
          );
        }
        console.log("Database operation successful:", dbOperation);
      } catch (error) {
        console.error("Error processing event:", error);
      }
    }

    return { success: true, events: bookedSlots };
  } catch (error: any) {
    console.error("Calendly API error:", error.response?.data || error.message);
    return {
      error: "Failed to fetch Calendly event types",
      details: error?.response?.data || error.message,
    };
  }
};
