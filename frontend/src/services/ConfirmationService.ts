import FrappeAPI from "../utils/frappeAPI";
import type { FlowRequestItem } from "../types/flows";

type FunnelDetailsResponse = { data: FlowRequestItem[] };

export const ConfirmationService = async (
  doctype: string,
): Promise<FlowRequestItem[]> => {
  // Use funnel activity details (same API used in Separation)
  const response = (await FrappeAPI.callMethod(
    "cn_hrms_core.cn_hrms_core.apis.funnel_activity.get_funnel_activity_details",
    { doctype },
  )) as FunnelDetailsResponse;

  const items = Array.isArray(response?.data) ? response.data : [];
  return items;
};

export const ConfirmationEmployeeService = async () => {
  const res = await FrappeAPI.getDocumentList("Employee Confirmation", {
    fields: ["*"],
  });
  return {
    data: res.data,
  };
};