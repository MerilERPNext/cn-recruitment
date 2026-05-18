import FrappeAPI from "../utils/frappeAPI";
import type { MandatoryTasksResponse } from "../types/mandatoryTasks";

const GET_MANDATORY_TASKS_METHOD =
  "cn_hrms_core.cn_hrms_core.apis.funnel_activity.get_mandatory_tasks";

export const mandatoryTasksService = {
  getMandatoryTasks: async (): Promise<MandatoryTasksResponse> => {
    const response = await FrappeAPI.callMethod(GET_MANDATORY_TASKS_METHOD, {});
    return response as MandatoryTasksResponse;
  },
};
