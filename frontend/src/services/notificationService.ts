import { UnreadNotificationCountResponse } from "../types/notification";
import FrappeAPI from "../utils/frappeAPI";

export const notificationService = {
  getUnreadNotificationCount: async (
    userEmail: string
  ): Promise<UnreadNotificationCountResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_hrms_core.cn_hrms_core.apis.notification_count.get_unread_notification_count",
      {
        user: userEmail,
      }
    );

    return response as UnreadNotificationCountResponse;
  },
};
