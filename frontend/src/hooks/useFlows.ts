// src/hooks/useChatAssistant.ts
import { useQuery } from "@tanstack/react-query";
import { getChatAssistantData, getChatAssistantFlowInitiateData, getDifinitionNameForSeparation, } from "../services/flowsService";
import { AssistantTriggerResponse } from "../types/chatnextApiResponses";


export const useDifinitaionNameForSeparation = () => {
  return useQuery<string | AssistantTriggerResponse>({
    queryKey: ["chatAssistant"],
    queryFn: getDifinitionNameForSeparation,
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

export const useChatAssistantFlowInitiateData = (
  document_name: string | undefined,
  definition_name: string,
) => {
  return useQuery({
    queryKey: [
      "chatAssistant",
      "Employee",
      document_name,
      definition_name
    ],
    queryFn: () => getChatAssistantFlowInitiateData(
      document_name!,
      definition_name
    ),
    enabled: !!document_name && !!definition_name
  });
};


