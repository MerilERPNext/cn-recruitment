import { NotificationLog } from "../types/notificationLog";
import FrappeAPI from "../utils/frappeAPI";

export const NotificationService = {
  // Mark as Read
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  markAsRead: async (notificationId: string): Promise<any> => {
    return await FrappeAPI.callMethod("frappe.client.set_value", {
      doctype: "Notification Log",
      name: notificationId,
      fieldname: "read",
      value: 1,
    });
  }
}

export const NotificationAlertService = {
    getNotifications: async (): Promise<NotificationLog[]> => {
      const response = await FrappeAPI.getDocumentList("Notification Log", {
        fields: ["name", "subject", "for_user", "type", "read", "from_user", "creation"],
        orderBy: "creation desc",
        limit: 1000000,
      });
      return response.data as NotificationLog[];
    },
  };