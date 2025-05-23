import { supabase } from "../../services/supabaseClient";
import {
  CALENDAR_BOOKED_SLOTS,
  GHL_ACCOUNT_DETAILS,
  UTM_PARAMETERS,
} from "../../constants/tableAttributes";
import { SUPABASE_TABLE_NAME } from "../constant";
import { BookedSlots, Calendar } from "../../types/interfaces";

export async function checkCalendarByUtmParams(
  calendars: any[],
  utmParams: Record<string, string>,
  matchedStateIds: string[],
  shouldCheckState: boolean
): Promise<any[]> {
  const results = await Promise.all(
    calendars.map(async (calendar) => {
      const accountDetails =
        calendar[SUPABASE_TABLE_NAME.GHL_ACCOUNT_DETAILS]?.[0];
      if (!accountDetails) return null;

      const calendarStateIds = accountDetails[GHL_ACCOUNT_DETAILS.STATE] || [];
      const assetMinimumRaw =
        accountDetails[GHL_ACCOUNT_DETAILS.ASSEST_MINIMUM];
      const condition = (
        accountDetails[GHL_ACCOUNT_DETAILS.CONDITION] || "AND"
      ).toUpperCase();

      let assetMatch = true;

      if (assetMinimumRaw) {
        const [utmKeyId, minValueStr] = assetMinimumRaw.split(":");
        const minValue = parseFloat(minValueStr);

        if (utmKeyId && !isNaN(minValue)) {
          const { data } = await supabase
            .from(SUPABASE_TABLE_NAME.UTM_PARAMETERS)
            .select(UTM_PARAMETERS.UTM_PARAMETER)
            .eq(UTM_PARAMETERS.ID, utmKeyId)
            .single();

          const dynamicKey = data?.[UTM_PARAMETERS.UTM_PARAMETER];
          const utmValue = parseFloat(utmParams[dynamicKey]);

          if (!isNaN(utmValue)) {
            assetMatch = utmValue >= minValue;
          }
        }
      }

      const stateMatch = shouldCheckState
        ? calendarStateIds.some((id: string) => matchedStateIds.includes(id))
        : true;

      const shouldInclude =
        condition === "AND"
          ? stateMatch && assetMatch
          : stateMatch || assetMatch;

      return shouldInclude ? calendar : null;
    })
  );

  return results.filter((calendar) => calendar !== null);
}

export function sortCalendars(calendars: any[]) {
  return calendars.sort((a, b) => {
    // const bookedSlotsA = a.booked_slots ? a.booked_slots : 0;
    // const bookedSlotsB = b.booked_slots ? b.booked_slots : 0;

    // if (bookedSlotsA !== bookedSlotsB) {
    //   return bookedSlotsA - bookedSlotsB;
    // }

    // const priorityA = parseInt(
    //   a.ghl_account_details?.[0]?.priority_score || "0",
    //   10
    // );
    // const priorityB = parseInt(
    //   b.ghl_account_details?.[0]?.priority_score || "0",
    //   10
    // );

    // if (priorityA !== priorityB) {
    //   return priorityB - priorityA;
    // }

    const spendA = parseFloat(a.ghl_account_details?.[0]?.spend_amount || "0");
    const spendB = parseFloat(b.ghl_account_details?.[0]?.spend_amount || "0");

    return spendB - spendA;
  });
}

export async function getBookedSlots(
  ghlCalendarIds: string[]
): Promise<{ success: boolean; data?: BookedSlots[]; error?: any }> {
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
}

export const isOverlapping = (
  requestedStartTime: number,
  requestedEndTime: number,
  bookedStartTime: number,
  bookedEndTime: number
) => requestedStartTime < bookedEndTime && bookedStartTime < requestedEndTime;
