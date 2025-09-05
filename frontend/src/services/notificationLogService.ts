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