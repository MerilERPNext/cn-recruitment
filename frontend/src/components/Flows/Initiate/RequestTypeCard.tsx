import React from 'react'
import { ChatNextAssistantTrigger } from '../../../types/chatnextApiResponses';
import { useCurrentEmployeeIdCard } from '../../../hooks/useEmployee';
import { useChatAssistantFlowInitiateData } from '../../../hooks/useFlows';

interface RequestTypeCardProps {
  data: ChatNextAssistantTrigger
}

const RequestTypeCard: React.FC<RequestTypeCardProps> = ({ data }) => {

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
        const trigger = await mutateAsync({
          document_name: employeeIdCard?.id || "",
          definition_name: data.name,
        })
        window.trigger_chatnext_assistant(true, trigger?.session);
      } catch (error: any) {
        console.error("Error", error?.message);
      }
    } else {
      console.warn("⚠️ trigger_chatnext_assistant is not available on window.");
    }
  };

  return (
    <div
      onClick={handleTriggerFlow}
      className="border px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-center hover:bg-gray-100 cursor-pointer text-sm sm:text-base w-fit max-w-full break-words">
      {data.data_obj.name_of_action}
    </div>
  );
};

export default RequestTypeCard