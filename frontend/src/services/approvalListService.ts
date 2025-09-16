// services/attendanceService.ts
import FrappeAPI from "../utils/frappeAPI";

export const approvalListServices = {
  multiActionHandler: async (
    action: string,
    name: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> => {
    try {
      const response = await FrappeAPI.callMethod(
        "nextai.funnel.doctype.funnel_task.awaiting_actions.chatnext_assistant_multi_actions.select_event_from_options",
        {
          selected_option: action,
          data: JSON.stringify({ name }),
        }
      );
      return response;
    } catch (error) {
      console.error("📡 Error while Adding attendance request in:", error);
      throw error;
    }
  },
  fetchUsers: async (
    emails: string[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> => {
    try {
      const res = (await FrappeAPI.callMethod("frappe.client.get_list", {
        doctype: "User",
        filters: [["email", "in", emails]],
        fields: ["email", "full_name"], // we need email to build map
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any[];

      // Convert to key-value pair: { email: full_name }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = {} as any;
      res.forEach((user: { email: string | number; full_name: string }) => {
        map[user.email] = user.full_name || user.email;
      });
      return map;
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  },
};
