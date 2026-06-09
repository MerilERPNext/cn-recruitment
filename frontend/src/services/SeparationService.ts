import { SeparationFunnelDetails, NoticePeriodAndSeparationPolicyResponse } from "../types/flows";
import FrappeAPI from "../utils/frappeAPI";

export const SeparationEmployeeService = async () => {
  const res = await FrappeAPI.getDocumentList("Employee Separation", {
    fields: ["*"],
  });
  return {
    data: res.data,
  };
};


export const getSeparationFunnelDetails = async (
) => {
  const response = await FrappeAPI.callMethod('cn_hrms_core.cn_hrms_core.apis.funnel_activity.get_funnel_activity_details',
    {
      doctype: "Employee Separation"
    },
  );

  return response as SeparationFunnelDetails;
};

export const getEmployeeSeparationType = async (
  doctype = "Employee Separation",
  docname: string,
) => {
  const response = await FrappeAPI.getDocument(doctype, docname, ["custom_resignaion_type"])

  return response as { custom_resignaion_type?: string };
};

export const getNoticePeriodAndSeparationPolicy = async (employee: string) => {
  const response = await FrappeAPI.callMethod(
    'cn_hrms_core.cn_hrms_core.apis.assignment_details.get_notice_period_and_separation_policy',
    { employee }
  );

  return response as NoticePeriodAndSeparationPolicyResponse;
};