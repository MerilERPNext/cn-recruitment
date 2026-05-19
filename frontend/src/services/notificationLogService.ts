/* eslint-disable @typescript-eslint/no-explicit-any */
import { NotificationLog } from "../types/notificationLog";
import FrappeAPI from "../utils/frappeAPI";

export const NotificationService = {
  markAsRead: async (notificationId: string): Promise<any> => {
    return await FrappeAPI.callMethod("frappe.client.set_value", {
      doctype: "Notification Log",
      name: notificationId,
      fieldname: "read",
      value: 1,
    });
  },

  markAllAsRead: async (notificationIds: string[]): Promise<void> => {
    await Promise.all(
      notificationIds.map((id) =>
        FrappeAPI.callMethod("frappe.client.set_value", {
          doctype: "Notification Log",
          name: id,
          fieldname: "read",
          value: 1,
        })
      )
    );
  },
};

export const NotificationAlertService = {
  getNotifications: async (
    limit = 100,
    offset = 0,
    readFilter?: 0 | 1
  ): Promise<NotificationLog[]> => {
    const filters: any[] = [];
    if (readFilter !== undefined) {
      filters.push(["read", "=", readFilter]);
    }

    const response = await FrappeAPI.getDocumentList("Notification Log", {
      fields: ["name", "subject", "for_user", "type", "read", "from_user", "creation","email_content"],
      filters,
      orderBy: "creation desc",
      limit,
      limitStart: offset,
    });

    return response.data as NotificationLog[];
  },
};