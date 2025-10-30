// src/hooks/useChatAssistant.ts
import { useQuery } from "@tanstack/react-query";
import { getChatAssistantData, getDifinitionName } from "../services/flowsService";


export const useDifinitaionName = () => {
  return useQuery<string>({
    queryKey: ["chatAssistant"],
    queryFn: getDifinitionName,
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
