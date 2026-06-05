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
    for_user: string,
    limit = 100,
    offset = 0,
    readFilter?: 0 | 1
  ): Promise<NotificationLog[]> => {
    const filters: any[] = [];
    if (readFilter !== undefined) {
      filters.push(["read", "=", readFilter]);
    }

    const response = await FrappeAPI.callMethod(
      "cn_hrms_core.cn_hrms_core.apis.notifications.get_unread_notifications",
      {
        for_user,
        limit_page_length: limit,
        start: offset,
        filters,
        filter: filters,
        order_by: "creation desc",
      }
    );

    return (response || []) as NotificationLog[];
  },
};