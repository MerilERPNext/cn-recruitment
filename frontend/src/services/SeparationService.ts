import FrappeAPI from "../utils/frappeAPI";

export const SeparationEmployeeService = async () => {
    const res = await FrappeAPI.getDocumentList("Employee Separation", {
      fields: ["*"],
    });
    return {
      data: res.data,
    };
  };


  export const getSeparationWorkflow = async (
  ) => {
    const response = FrappeAPI.callMethod('cn_hrms_core.cn_hrms_core.apis.funnel_activity.get_funnel_activity_details',
      {
        doctype: "Employee Separation"
      },
    );
  
    return response as any;
  };