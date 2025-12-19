import React from 'react'
import { ChatNextAssistantTrigger } from '../../../types/chatnextApiResponses';
import { useCurrentEmployeeIdCard } from '../../../hooks/useEmployee';
import { useChatAssistantFlowInitiateData } from '../../../hooks/useFlows';

interface RequestTypeCardProps {
  data: ChatNextAssistantTrigger
}

const RequestTypeCard: React.FC<RequestTypeCardProps> = ({ data }) => {

  const { data: employeeIdCard } = useCurrentEmployeeIdCard();
  const { data: trigger } = useChatAssistantFlowInitiateData(employeeIdCard?.id, data.name);

  const handleTriggerFlow = () => {
    if (
      typeof window !== "undefined" &&
      typeof window.trigger_chatnext_assistant === "function"
    ) {
      window.trigger_chatnext_assistant(true, trigger?.session);
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