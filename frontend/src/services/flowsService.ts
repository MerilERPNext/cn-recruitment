/* eslint-disable @typescript-eslint/no-explicit-any */
import FrappeAPI from "../utils/frappeAPI";

export const getDifinitionNameForSeparation = async (): Promise<string> => {
  const response = (await FrappeAPI.callMethod(
    "nextai.funnel.doctype.funnel_task.assistant_api.get_chatnext_assistant_private_doc_trigger_list",
    { doctype: "Employee" }
  ));
  return response as string;
};


export const getFlowConfigSelfTriggerList = async (): Promise<string> => {
  const response = await FrappeAPI.getMethod(
    "nextai.funnel.doctype.flow_config.flow_config.get_flow_config_self_initiate_trigger_list",
    { doctype: "Employee" }
  );
  return response as string;
};

export const getFlowConfigOthersTriggerList = async (
  employee: string
): Promise<string> => {
  const response = await FrappeAPI.getMethod(
    "nextai.funnel.doctype.flow_config.flow_config.get_flow_config_other_employee_initiate_trigger_list",
    { doctype: "Employee", employee }
  );
  return response as string;
};


export const getChatAssistantData = async (
  doctype_name: string,
  document_name: string,
  definition_name: string,
  l: string,
) => {
  const response = FrappeAPI.callMethod('nextai.funnel.doctype.funnel_task.triggers.chatnext_assistant_trigger.trigger',
    {
      definition_name: definition_name,
      variables: {
        doctype: doctype_name,
        docname: document_name,
        l: l,
      }
    },
  );

  return response as any;
};

export const getChatAssistantFlowInitiateData = async (
  document_name: string,
  definition_name: string
) => {
  const response = FrappeAPI.callMethod('nextai.funnel.doctype.funnel_task.triggers.chatnext_assistant_trigger.trigger',
    {
      definition_name,
      variables: {
        doctype: "Employee",
        docname: document_name,
      }
    },
  );

  return response as any;
};


// ?reference_doctype=Employee%20Separation&reference_docname=HR-EMP-SEP-2026-00001
export const getSeparationWorkflow = async (
  reference_doctype: string,
  reference_docname: string
) => {
  const response = FrappeAPI.callMethod('cn_hrms_core.cn_hrms_core.apis.funnel_activity.get_funnel_activity',
    {
      reference_doctype,
      reference_docname
    },
  );

  return response as any;
};


export const getSeparationFunnelData = async (
  docname: string
) => {
  const response = await FrappeAPI.callMethod('nextai.funnel.doctype.funnel_task.awaiting_actions.chatnext_assistant_multi_actions.get_permitted_multi_actions',
    {
      doctype: "Employee Separation",
      docname
    },
  );

  return response ?? [] as any;
};

export const postSelectEventFromOptions = async (
  selected_option: string,
  data: string,
) => {
  const response = FrappeAPI.callMethod('nextai.funnel.doctype.funnel_task.awaiting_actions.chatnext_assistant_multi_actions.select_event_from_options',
    {
      selected_option,
      data,
      doctype: "Employee Separation"
    },
  );

  return response as any;
};

export const getShouldShowConfirmationButton = async (
) => {
  const response = FrappeAPI.callMethod('recruitment.recruitment.scheduled_jobs.should_show_confirmation_button');
  return response as any;
};


// ?reference_doctype=Employee%20Separation&reference_docname=HR-EMP-SEP-2026-00001
export const getFlowRequests = async (
) => {
  const response = FrappeAPI.callMethod('cn_hrms_core.cn_hrms_core.apis.funnel_activity.get_funnel_activity_details',
    {
      doctype: "Employee"
    },
  );

  return response as any;
};


// ?reference_doctype=Employee%20Separation&reference_docname=HR-EMP-SEP-2026-00001
export const getOpenApprovalTodos = async (
  filters: Record<string, string>
) => {
  const response = FrappeAPI.callMethod('cn_leave_shift_managment.api.get_open_approval_todos',
    {
      filters: JSON.stringify(filters)
    },
  );

  return response as any;
};
