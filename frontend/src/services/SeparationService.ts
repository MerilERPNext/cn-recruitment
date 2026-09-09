import { SeparationFunnelDetails, NoticePeriodAndSeparationPolicyResponse, EmployeeSeparationDetails } from "../types/flows";
import {
  EmployeeSupportContacts,
  SeparationOpenItemsData,
  SeparationWorkflowStagesResponse,
} from "../types/separation";
import FrappeAPI from "../utils/frappeAPI";

export const getSeparationWorkflowStages = async (
  employee: string
): Promise<SeparationWorkflowStagesResponse> => {
  if (!employee) {
    return {
      employee: "",
      separation: "",
      flow_status: "",
      total_stages: 0,
      cleared_stages: 0,
      pending_stages: 0,
      workflow_stages: [],
    };
  }

  const response = await FrappeAPI.getMethod(
    "cn_hrms_core.cn_hrms_core.apis.separation_details.get_separation_workflow_stages",
    { employee }
  );

  return response as SeparationWorkflowStagesResponse;
};

export const getSeparationOpenItems = async (
  employee: string
): Promise<SeparationOpenItemsData> => {
  if (!employee) {
    return {
      employee: "",
      open_tasks: { user: "", open_tasks: 0 },
      attendance_flags: {
        from_date: "",
        to_date: "",
        total_flags: 0,
        absent_days: 0,
        lwp_days: 0,
      },
      expenses: { total_claims: 0, total_amount: 0 },
    };
  }

  const response = await FrappeAPI.getMethod(
    "cn_hrms_core.cn_hrms_core.apis.separation_details.get_open_items",
    { employee }
  );

  return response as SeparationOpenItemsData;
};

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

export const getEmployeeSupportContacts = async (
  employeeId: string
): Promise<EmployeeSupportContacts> => {
  if (!employeeId) {
    return {
      relieving_date: "",
      manager: { id: "", name: "N/A", email: "" },
      hrbp: { id: "", name: "N/A", email: "" },
      hdTeam: { id: "", name: "N/A", email: "" },
    };
  }

  // 1. Fetch employee document with reporting manager, HRBP, HD support team, and relieving date
  const employeeDoc = (await FrappeAPI.getDocument("Employee", employeeId, [
    "name",
    "employee_name",
    "reports_to",
    "custom_hrbp",
    "custom_hd_team",
    "relieving_date",
  ]).catch(() => null)) as {
    name?: string;
    employee_name?: string;
    reports_to?: string;
    custom_hrbp?: string;
    custom_hd_team?: string;
    relieving_date?: string;
  } | null;

  const managerId = employeeDoc?.reports_to || "";
  const hrbpId = employeeDoc?.custom_hrbp || "";
  const hdTeamId = employeeDoc?.custom_hd_team || "";
  const relievingDate = employeeDoc?.relieving_date || "";

  // 2. Fetch respective employee/contact details in parallel
  const [managerDoc, hrbpDoc, hdTeamDoc] = await Promise.all([
    managerId
      ? FrappeAPI.getDocument("Employee", managerId, [
          "name",
          "employee_name",
          "company_email",
          "personal_email",
        ]).catch(() => null)
      : null,
    hrbpId
      ? FrappeAPI.getDocument("Employee", hrbpId, [
          "name",
          "employee_name",
          "company_email",
          "personal_email",
        ]).catch(() => null)
      : null,
    hdTeamId
      ? FrappeAPI.getDocument("Employee", hdTeamId, [
          "name",
          "employee_name",
          "company_email",
          "personal_email",
        ]).catch(() => null)
      : null,
  ]);

  const managerData = managerDoc as {
    employee_name?: string;
    company_email?: string;
    personal_email?: string;
  } | null;
  const hrbpData = hrbpDoc as {
    employee_name?: string;
    company_email?: string;
    personal_email?: string;
  } | null;
  const hdTeamData = hdTeamDoc as {
    employee_name?: string;
    company_email?: string;
    personal_email?: string;
  } | null;

  return {
    relieving_date: relievingDate,
    manager: {
      id: managerId,
      name: managerData?.employee_name || managerId || "N/A",
      email: managerData?.company_email || managerData?.personal_email || "",
    },
    hrbp: {
      id: hrbpId,
      name: hrbpData?.employee_name || hrbpId || "N/A",
      email: hrbpData?.company_email || hrbpData?.personal_email || "",
    },
    hdTeam: {
      id: hdTeamId,
      name: hdTeamData?.employee_name || hdTeamId || "N/A",
      email: hdTeamData?.company_email || hdTeamData?.personal_email || "",
    },
  };
};