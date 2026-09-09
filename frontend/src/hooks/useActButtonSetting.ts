import { useQuery } from "@tanstack/react-query";
import FrappeAPI from "../utils/frappeAPI";

export interface ActButtonSystemSettingResponse {
  show_act_button_on_all_tasks: boolean;
}

export const useActButtonSetting = () => {
  return useQuery<boolean>({
    queryKey: ["system-settings", "show-act-button-on-all-tasks"],
    queryFn: async () => {
      try {
        const response = (await FrappeAPI.callMethod(
          "recruitment.api.system_format_options.get_act_button_system_setting"
        )) as ActButtonSystemSettingResponse | undefined;
        return Boolean(response?.show_act_button_on_all_tasks);
      } catch (error) {
        console.warn("Failed to fetch show_act_button_on_all_tasks setting:", error);
        return false;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
