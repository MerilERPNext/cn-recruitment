import React from 'react'
import { ChatNextAssistantTrigger } from '../../../types/chatnextApiResponses';
import { useCurrentEmployeeIdCard } from '../../../hooks/useEmployee';
import { useChatAssistantFlowInitiateData } from '../../../hooks/useFlows';

interface RequestTypeCardProps {
  data: ChatNextAssistantTrigger;
  targetEmployeeId?: string;
}

const RequestTypeCard: React.FC<RequestTypeCardProps> = ({ data, targetEmployeeId }) => {

  const { data: employeeIdCard } = useCurrentEmployeeIdCard();
  const {
    mutateAsync
  } = useChatAssistantFlowInitiateData();

  const handleTriggerFlow = async () => {
    if (
      typeof window !== "undefined" &&
      typeof window.trigger_chatnext_assistant === "function"
    ) {
      try {
        const documentName = targetEmployeeId || employeeIdCard?.id || "";
        const trigger = await mutateAsync({
          document_name: documentName,
          definition_name: data.name,
        })
        window.trigger_chatnext_assistant(true, trigger?.session);
      } catch (error: unknown) {
        console.error("Error", error instanceof Error ? error.message : error);
      }
    } else {
      console.warn("⚠️ trigger_chatnext_assistant is not available on window.");
    }
  };

  return (
    <div
      onClick={handleTriggerFlow}
      className="border border-border bg-card text-text-body1 px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-center hover:bg-primary/10 hover:border-primary/40 hover:text-text-title cursor-pointer text-sm sm:text-base w-fit max-w-full break-words transition-colors">
      {data.data_obj.name_of_action}
    </div>
  );
};

export default RequestTypeCard