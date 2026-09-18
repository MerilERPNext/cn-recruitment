import FrappeAPI from "../utils/frappeAPI";

export interface GoogleCalendarStatus {
  configured: boolean;
  connected: boolean;
  calendar?: string;
  google_account?: string;
  flash?: {
    message: string;
    indicator: string;
  } | null;
  redirect_uri?: string;
}

export interface SyncCalendarResponse {
  status: "synced" | "importing" | "pull_disabled" | string;
  message: string;
}

export const integrationService = {
  getGoogleCalendarStatus: async (): Promise<GoogleCalendarStatus> => {
    try {
      const res = await FrappeAPI.callMethod(
        "cn_hrms_core.cn_hrms_core.apis.google_calendar_connect.get_status"
      );
      return (res as GoogleCalendarStatus) || { configured: false, connected: false };
    } catch (error) {
      console.error("Failed to fetch Google Calendar status:", error);
      return { configured: false, connected: false };
    }
  },

  syncGoogleCalendar: async (): Promise<SyncCalendarResponse> => {
    const res = await FrappeAPI.callMethod(
      "cn_hrms_core.cn_hrms_core.apis.google_calendar_connect.sync_calendar"
    );
    return res as SyncCalendarResponse;
  },

  connectGoogleCalendar: async (redirectTo?: string): Promise<string> => {
    const res = await FrappeAPI.callMethod(
      "cn_hrms_core.cn_hrms_core.apis.google_calendar_connect.connect",
      { redirect_to: redirectTo || window.location.pathname }
    );
    return res as string;
  },
};
