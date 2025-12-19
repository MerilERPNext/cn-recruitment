// src/hooks/useChatAssistant.ts
import { useMutation, useQuery } from "@tanstack/react-query";
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

