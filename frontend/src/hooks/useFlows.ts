// src/hooks/useChatAssistant.ts
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getChatAssistantData,
  getChatAssistantFlowInitiateData,
  getFlowConfigSelfTriggerList,
  getFlowConfigOthersTriggerList,
  getFlowRequests,
  getOpenApprovalTodos,
  getSeparationFunnelData,
  getSeparationWorkflow,
  getShouldShowConfirmationButton,
  postSelectEventFromOptions,
  getDifinitionNameForSeparation
} from "../services/flowsService";
import { AssistantTriggerResponse } from "../types/chatnextApiResponses";
import { SeparationFunnelDataResponse, SeparationWorkflowResponse } from "../types/separation";
import { approvalListServices } from "../services/approvalListService";
import { FlowRequestResponse } from "../types/flows";

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


export const useGetOpenApprovalTodos = (
  name: string
) => {
  return useQuery<FlowRequestResponse>({
    queryKey: [
      "employee-flow-requests",
    ],
    queryFn: () => getOpenApprovalTodos({ name }),
    enabled: !!name
  });
};
