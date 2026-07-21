import { SeparationFunnelDetails, NoticePeriodAndSeparationPolicyResponse, EmployeeSeparationDetails } from "../types/flows";
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

export const getEmployeeSeparationDetails = async (docname: string) => {
  const fields = [
    "name",
    "custom_resignation_date",
    "custom_notice_period_days",
    "custom_final_recovery_days",
    "custom_final_reason_for_separation",
    "custom_proposed_recovery_days",
    "custom_final_category_for_separation",
    "custom_mark_do_not_rehire",
    "custom_reason_for_proposed_recovery_days",
    "custom_proposed_last_working_day",
    "custom_requested_last_working_date",
  ];

  const response = await FrappeAPI.getDocument("Employee Separation", docname, fields);
  return response as EmployeeSeparationDetails;
};

export const revokeEmployeeSeparation = async (
  separation_name: string,
  reason: string
) => {
  if (!separation_name) {
    throw new Error("separation_name is required");
  }
  return FrappeAPI.callMethod(
    "nextai.funnel.doctype.flow_config.revoke_separation.revoke_employee_separation",
    {
      separation_name,
      reason,
    }
  );
};