/* eslint-disable @typescript-eslint/no-explicit-any */
import FrappeAPI from "../utils/frappeAPI";
import type { FunnelActivityLogResponse, ShouldShowSeparationButtonResponse } from "../types/flows";

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

export const getShouldShowSeparationButton = async () => {
  const response = await FrappeAPI.callMethod(
    'recruitment.recruitment.scheduled_jobs.should_show_separation_button'
  );
  return response as ShouldShowSeparationButtonResponse;
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

// cn_hrms_core.cn_hrms_core.apis.funnel_activity.get_funnel_activity_detail_by_id?funnel_activity_id=u2frkv4g7d
export const getFlowRequestById = async (
  funnel_activity_id: string
) => {
  const response = FrappeAPI.callMethod('cn_hrms_core.cn_hrms_core.apis.funnel_activity.get_funnel_activity_detail_by_id',
    {
      funnel_activity_id
    },
  );

  return response as any;
};

// cn_hrms_core.cn_hrms_core.apis.funnel_activity.get_funnel_activity_log?funnel_activity_id=rl7mpd6vkc
export const getFunnelActivityLog = async (funnel_activity_id: string) => {
  const response = await FrappeAPI.callMethod(
    "cn_hrms_core.cn_hrms_core.apis.funnel_activity.get_funnel_activity_log",
    { funnel_activity_id },
  );

  return response as FunnelActivityLogResponse;
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

export const updateInitiatorFormSubmission = async (
  conversation_doc: string,
  submission_data: Record<string, unknown>
) => {
  const response = await FrappeAPI.callMethod(
    'cn_hrms_core.cn_hrms_core.apis.funnel_activity.update_initiator_form_submission',
    {
      conversation_doc,
      submission_data: JSON.stringify(submission_data),
    },
  );

  return response as any;
};

export const reinitiateStage = async (
  funnel_task: string,
  with_dependents: 0 | 1
) => {
  const response = await FrappeAPI.callMethod(
    'nextai.funnel.doctype.funnel_task.reinitiate.reinitiate_stage',
    {
      funnel_task,
      with_dependents,
    },
  );

  return response as any;
};

export const reinitiateFlow = async (
  funnel_activity: string
) => {
  const response = await FrappeAPI.callMethod(
    'nextai.funnel.doctype.funnel_task.reinitiate.reinitiate_flow',
    {
      funnel_activity,
    },
  );

  return response as any;
};

export const retriggerApprovalFlowEvent = async (
  todo: string
) => {
  const response = await FrappeAPI.callMethod(
    'nextai.funnel.doctype.funnel_task.awaiting_actions.chatnext_dynamic_multi_actions.retrigger_event',
    {
      todo,
    },
  );

  return response as any;
};

export const revokeFlow = async (
  funnel_activity: string,
  reason: string
) => {
  const response = await FrappeAPI.callMethod(
    "nextai.funnel.doctype.flow_config.revoke_flow.revoke_flow",
    {
      funnel_activity,
      reason,
    }
  );
  return response as any;
};
