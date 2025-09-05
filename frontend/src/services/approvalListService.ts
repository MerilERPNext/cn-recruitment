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
};
