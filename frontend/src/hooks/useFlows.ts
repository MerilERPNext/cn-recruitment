// src/hooks/useChatAssistant.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import type { ChatNextAssistantTrigger } from "../types/chatnextApiResponses";
import { useLoadingOverlay } from "../context/OverlayContext";
import {
  getChatAssistantData,
  getChatAssistantFlowInitiateData,
  getFlowConfigSelfTriggerList,
  getFlowConfigOthersTriggerList,
  getFlowRequests,
  getSeparationFunnelData,
  getSeparationWorkflow,
  getShouldShowConfirmationButton,
  getShouldShowSeparationButton,
  postSelectEventFromOptions,
  getDifinitionNameForSeparation,
  getFlowRequestById,
  updateInitiatorFormSubmission,
  getFunnelActivityLog,
  reinitiateStage,
  reinitiateFlow,
  retriggerApprovalFlowEvent,
  revokeFlow,
} from "../services/flowsService";
import { AssistantTriggerResponse } from "../types/chatnextApiResponses";
import { SeparationFunnelDataResponse, SeparationWorkflowResponse } from "../types/separation";
import { approvalListServices } from "../services/approvalListService";
import {
  FlowRequestDetailItem,
  FlowRequestResponse,
  FunnelActivityLogResponse,
  ShouldShowSeparationButtonResponse,
} from "../types/flows";

export const useDifinitaionNameForSeparation = () => {
  return useQuery<string | AssistantTriggerResponse>({
    queryKey: ["chatAssistant"],
    queryFn: getDifinitionNameForSeparation,
  });
};

export const useFlowConfigSelfTriggerList = () => {
  return useQuery<string | AssistantTriggerResponse>({
    queryKey: ["flowConfigSelfTriggerList"],
    queryFn: getFlowConfigSelfTriggerList,
  });
};

export const useFlowConfigOthersTriggerList = (employee: string) => {
  return useQuery<string | AssistantTriggerResponse>({
    queryKey: ["flowConfigOthersTriggerList", employee],
    queryFn: () => getFlowConfigOthersTriggerList(employee),
    enabled: !!employee,
  });
};


export const useChatAssistant = (
  doctype_name: string,
  document_name: string,
  definition_name: string,
  l: string,
) => {
  return useQuery({
    queryKey: [
      "chatAssistant",
      doctype_name,
      document_name,
      definition_name,
      l
    ],
    queryFn: () => getChatAssistantData(
      doctype_name,
      document_name,
      definition_name,
      l
    ),
    enabled:
      !!doctype_name
      && !!document_name
      && !!definition_name
      && !!l, // fetch tabhi jab data mile
  });
};

export const useChatAssistantLazy = () => {
  return useMutation({
    mutationFn: ({
      doctype_name,
      document_name,
      definition_name,
      l,
    }: {
      doctype_name: string;
      document_name: string;
      definition_name: string;
      l: string;
    }) =>
      getChatAssistantData(doctype_name, document_name, definition_name, l),
  });
};

export const useChatAssistantFlowInitiateData = () => {
  return useMutation({
    mutationFn: ({
      document_name,
      definition_name,
    }: {
      document_name: string;
      definition_name: string;
    }) =>
      getChatAssistantFlowInitiateData(
        document_name,
        definition_name
      ),
  });
};

export const useGetSeparationWorkflow = (
  reference_doctype: string,
  reference_docname: string
) => {
  return useQuery<SeparationWorkflowResponse>({
    queryKey: [
      "get-separation-workflow",
      reference_doctype,
      reference_docname
    ],
    queryFn: () => getSeparationWorkflow(
      reference_doctype,
      reference_docname
    ),
    enabled:
      !!reference_doctype
      && !!reference_docname
  });
};

export const useGetSeparationFunnelData = (
  docname: string
) => {
  return useQuery<SeparationFunnelDataResponse>({
    queryKey: [
      "get-separation-funnel",
      docname
    ],
    queryFn: () => getSeparationFunnelData(
      docname
    ),
    enabled: !!docname
  });
};

export const usePostSelectEventFromOptions = () => {
  return useMutation({
    mutationFn: ({
      selected_option,
      data,
    }: {
      selected_option: string;
      data: string;
    }) =>
      postSelectEventFromOptions(
        selected_option,
        data
      ),
  });
};

type shouldShowConfirmationType = {
  show_button: boolean;
  days_until_confirmation: number;
  trigger_days: number;
};

export const useGetShouldShowConfirmationButton = (
  targetEmp: string
) => {
  return useQuery<shouldShowConfirmationType>({
    queryKey: [
      "should-show-confirmation",
      targetEmp
    ],
    queryFn: () => getShouldShowConfirmationButton(),
    enabled: !!targetEmp
  });
};

export const useGetShouldShowSeparationButton = () => {
  return useQuery<ShouldShowSeparationButtonResponse>({
    queryKey: ["should-show-separation"],
    queryFn: getShouldShowSeparationButton,
  });
};


export function useConfirmationApproval() {

  return useMutation({
    mutationFn: async ({ action, name }: { action: string; name: string }) =>
      approvalListServices.multiActionHandler(action, name),
  });
}

export const useGetFlowRequests = (
) => {
  return useQuery<FlowRequestResponse>({
    queryKey: [
      "employee-flow-requests"
    ],
    queryFn: () => getFlowRequests(),
  });
};

export const useGetFlowRequestById = (
  funnel_activity_id: string
) => {
  return useQuery<{ data: FlowRequestDetailItem }>({
    queryKey: [
      "employee-flow-request-details",
      funnel_activity_id
    ],
    queryFn: () => getFlowRequestById(funnel_activity_id),
    enabled: !!funnel_activity_id
  });
};

export const useGetFunnelActivityLog = (
  funnel_activity_id: string,
  enabled = true,
) => {
  return useQuery<FunnelActivityLogResponse>({
    queryKey: ["funnel-activity-log", funnel_activity_id],
    queryFn: () => getFunnelActivityLog(funnel_activity_id),
    enabled: !!funnel_activity_id && enabled,
  });
};

export const useUpdateInitiatorFormSubmission = () => {
  return useMutation({
    mutationFn: ({
      conversation_doc,
      submission_data,
    }: {
      conversation_doc: string;
      submission_data: Record<string, unknown>;
    }) =>
      updateInitiatorFormSubmission(conversation_doc, submission_data),
  });
};

export const useReinitiateStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      funnel_task,
      with_dependents,
    }: {
      funnel_task: string;
      with_dependents: 0 | 1;
    }) => reinitiateStage(funnel_task, with_dependents),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-flow-requests"] });
      queryClient.invalidateQueries({ queryKey: ["employee-flow-request-details"] });
      queryClient.invalidateQueries({ queryKey: ["separation-employee"] });
    },
  });
};

export const useReinitiateFlow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ funnel_activity }: { funnel_activity: string }) =>
      reinitiateFlow(funnel_activity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-flow-requests"] });
      queryClient.invalidateQueries({ queryKey: ["employee-flow-request-details"] });
      queryClient.invalidateQueries({ queryKey: ["separation-employee"] });
      queryClient.invalidateQueries({ queryKey: ["separation-workflow"] });
    },
  });
};

/**
 * Filters the full trigger list by trigger_category_name and optionally button_label.
 * Use this to find the correct definition_name for a given flow trigger.
 *
 * @example
 * // For Confirmation trigger:
 * getDefinitionByFilter(data, { triggerCategory: "Confirmation" })
 *
 * // For Separation trigger (within Confirmation category):
 * getDefinitionByFilter(data, { triggerCategory: "Confirmation", buttonLabel: "Recommend for Separation" })
 */
export const getDefinitionByFilter = (
  data: AssistantTriggerResponse | string | undefined,
  filters: { triggerCategory: string; buttonLabel?: string },
): ChatNextAssistantTrigger | undefined => {
  if (!Array.isArray(data)) return undefined;

  return data.find((item: ChatNextAssistantTrigger) => {
    const categoryMatch =
      item?.trigger_category?.name === filters.triggerCategory ||
      item?.trigger_category_name === filters.triggerCategory;

    if (!categoryMatch) return false;
    if (!filters.buttonLabel) return true;

    return item?.button_label === filters.buttonLabel;
  });
};

/**
 * Centralized hook for triggering a ChatNext assistant flow.
 * Encapsulates the mutation, polling for `window.trigger_chatnext_assistant`, and overlay management.
 *
 * @param overlayMessage - Message to show in the loading overlay while triggering.
 * @returns { triggerChat, isTriggeringChat }
 */
export const useChatTrigger = (overlayMessage = "Loading form...") => {
  const { mutateAsync: fetchChatAssistantData } = useChatAssistantLazy();
  const [isTriggeringChat, setIsTriggeringChat] = useState(false);
  const loading = useLoadingOverlay();

  const triggerChat = useCallback(
    async (params: {
      doctype_name: string;
      document_name: string;
      definition_name: string;
      l?: string;
    }) => {
      setIsTriggeringChat(true);
      loading.show(overlayMessage);

      try {
        const data = await fetchChatAssistantData({
          doctype_name: params.doctype_name,
          document_name: params.document_name,
          definition_name: params.definition_name,
          l: params.l ?? "true",
        });

        const maxAttempts = 500; // 50 seconds max (500 * 100ms)
        let attempts = 0;

        const checkAndTrigger = () => {
          if (
            typeof window !== "undefined" &&
            typeof window.trigger_chatnext_assistant === "function"
          ) {
            window.trigger_chatnext_assistant(true, data?.session);
            setIsTriggeringChat(false);
            loading.hide();
            return;
          }

          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkAndTrigger, 100);
          } else {
            console.warn(
              "⚠️ trigger_chatnext_assistant is not available on window after 50 seconds.",
            );
            setIsTriggeringChat(false);
            loading.hide();
          }
        };

        checkAndTrigger();
      } catch (error) {
        console.error("Failed to trigger chat assistant:", error);
        setIsTriggeringChat(false);
        loading.hide();
      }
    },
    [fetchChatAssistantData, loading, overlayMessage],
  );

  return { triggerChat, isTriggeringChat };
};

export const useRetriggerApprovalFlowEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ todo }: { todo: string }) =>
      retriggerApprovalFlowEvent(todo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-flow-requests"] });
      queryClient.invalidateQueries({ queryKey: ["employee-flow-request-details"] });
      queryClient.invalidateQueries({ queryKey: ["separation-employee"] });
      queryClient.invalidateQueries({ queryKey: ["separation-workflow"] });
      queryClient.invalidateQueries({ queryKey: ["get-separation-workflow"] });
      queryClient.invalidateQueries({ queryKey: ["get-separation-funnel"] });
      queryClient.invalidateQueries({ queryKey: ["should-show-confirmation"] });
    },
  });
};

export const useRevokeFlow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ funnel_activity, reason }: { funnel_activity: string; reason: string }) =>
      revokeFlow(funnel_activity, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-flow-requests"] });
      queryClient.invalidateQueries({ queryKey: ["employee-flow-request-details"] });
      queryClient.invalidateQueries({ queryKey: ["separation-employee"] });
      queryClient.invalidateQueries({ queryKey: ["separation-workflow"] });
      queryClient.invalidateQueries({ queryKey: ["get-separation-workflow"] });
      queryClient.invalidateQueries({ queryKey: ["get-separation-funnel"] });
    },
  });
};
