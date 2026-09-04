import React, { useState } from 'react'
import { ChatNextAssistantTrigger } from '../../../types/chatnextApiResponses';
import { useCurrentEmployeeIdCard } from '../../../hooks/useEmployee';
import { useChatAssistantFlowInitiateData } from '../../../hooks/useFlows';
import ActionConfirmationModal from '../../shared/ActionConfirmationModal';

interface RequestTypeCardProps {
  data: ChatNextAssistantTrigger;
  targetEmployeeId?: string;
}

const RequestTypeCard: React.FC<RequestTypeCardProps> = ({ data, targetEmployeeId }) => {

  const { data: employeeIdCard } = useCurrentEmployeeIdCard();
  const {
    mutateAsync,
    isPending,
  } = useChatAssistantFlowInitiateData();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleCardClick = () => {
    setIsConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (
      typeof window !== "undefined" &&
      typeof window.trigger_chatnext_assistant === "function"
    ) {
      try {
        const documentName = targetEmployeeId || employeeIdCard?.id || "";
        const trigger = await mutateAsync({
          document_name: documentName,
          definition_name: data.name,
        });
        setIsConfirmOpen(false);
        window.trigger_chatnext_assistant(true, trigger?.session);
      } catch (error: any) {
        console.error("Error", error?.message);
        setIsConfirmOpen(false);
      }
    } else {
      console.warn("⚠️ trigger_chatnext_assistant is not available on window.");
      setIsConfirmOpen(false);
    }
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className="border px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-center hover:bg-gray-100 cursor-pointer text-sm sm:text-base w-fit max-w-full break-words">
        {data.data_obj.name_of_action}
      </div>

      <ActionConfirmationModal
        isOpen={isConfirmOpen}
        title="Initiate Flow"
        message={`Are you sure you want to initiate "${data.data_obj.name_of_action}"?`}
        confirmLabel="Yes, Initiate"
        cancelLabel="Cancel"
        confirmBgColor="primary"
        isPending={isPending}
        onConfirm={handleConfirm}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </>
  );
};

export default RequestTypeCard