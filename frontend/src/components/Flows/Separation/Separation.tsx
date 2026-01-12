/* eslint-disable @typescript-eslint/no-explicit-any */
import { Loader2 } from "lucide-react";
import image from "../../../assets/welcome-sep.svg";
import { useSeparation } from "../../../hooks/useConfiremnation";
import { useCurrentEmployeeAllDetails, useEmployee } from "../../../hooks/useEmployee";
import {
  useChatAssistant,
  useDifinitaionNameForSeparation,
  useGetSeparationWorkflow,
} from "../../../hooks/useFlows";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import Button from "../../shared/atoms/Button";
import ApprovalTracker from "../Confirmation/Component/ApprovalTracker";
import { useTargetUser } from "../../../context/ViewedUserContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Separation = () => {
  const { data: userId } = useLoggedInUser();
  const { data: employee_name } = useCurrentEmployeeAllDetails(userId || "");
  const doctype_name = "Employee";
  const doctype = "Employee Separation";
  const { targetEmployeeId, isViewingOtherUser } =
    useTargetUser();
  const { data: targetEmployee } = useEmployee(targetEmployeeId);
  const document_name = isViewingOtherUser ? targetEmployee?.name || "" : employee_name?.name || "";
  const { data: definitionName } = useDifinitaionNameForSeparation();
  const { data: confirmationCreationData, isLoading, refetch: refetchConfirmationAndSeparation } = useSeparation(doctype);
  const item = confirmationCreationData?.[0];

  function getFunnelData(trigger_category: string) {
    return Array.isArray(definitionName)
      ? definitionName.filter(
        (item: any) => item?.trigger_category?.name === trigger_category
      )
      : [];
  }

  const separationData = getFunnelData("Separation");
  console.log("separationData", separationData)
  const definition_name = separationData?.[0]?.name || "";
  const l = "true";

  const { data } = useChatAssistant(
    doctype_name,
    document_name,
    definition_name,
    l
  );

  const handleTriggerChat = () => {
    if (
      typeof window !== "undefined" &&
      typeof window.trigger_chatnext_assistant === "function"
    ) {
      window.trigger_chatnext_assistant(true, data?.session);
    } else {
      console.warn("⚠️ trigger_chatnext_assistant is not available on window.");
    }
  };

  useEffect(() => {
    const handleChatClose = () => {
      refetchConfirmationAndSeparation();
    };

    document.addEventListener("chatnext:modal:chat:close", handleChatClose);

    return () => {
      document.removeEventListener("chatnext:modal:chat:close", handleChatClose);
    };
  }, [refetchConfirmationAndSeparation]);

  const showInitiatePage = !item;

  const { data: separationWorkflow } = useGetSeparationWorkflow(doctype, item?.reference_document?.name || "");
  const navigate = useNavigate();
  const handleShowWorkflow = () => {
    navigate("/webapp/flow-app/separation-workflow/" + item?.reference_document?.name);
  }

  /* -------------------- LOADING Spinner -------------------- */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
          <span className="text-sm text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }
  /* ---------------------------------------------------------- */

  return (
    <div>
      <div className="flex flex-col min-h-screen p-6 gap-4 bg-white">
        {!showInitiatePage ? (
          <main className="min-h-full bg-background mb-2">
            {separationWorkflow?.show_workflow &&
              <Button
                onClick={handleShowWorkflow}
                size="md"
                bgColor="blue-500"
                className="hover:bg-blue-600 mb-4 text-white"
              >
                Show Workflow
              </Button>
            }
            <div className="max-w-full">
              <ApprovalTracker For="Employee Separation" data={item} />
            </div>
          </main>
        ) : (
          <div className="min-h-screen bg-gray-50 flex items-start justify-center">
            <div className="bg-gray-200 rounded-xl shadow-sm w-full max-w-full overflow-hidden">
              {/* Main content */}
              <div className="flex flex-col md:flex-row items-center justify-between">
                {/* Left Section */}
                <div className="flex-1 p-10">
                  <div className="bg-blue-200 text-black font-bold text-3xl md:text-4xl leading-snug p-8 rounded-lg w-fit">
                    <p>WE’RE SAD TO</p>
                    <p>SEE YOU GO</p>
                  </div>
                  <p className="mt-6 text-gray-700 text-sm md:text-base">
                    Please connect with your HBRP once
                  </p>
                </div>

                {/* Right Section */}
                <div className="flex-1 flex justify-center p-10">
                  <img
                    src={image}
                    alt="Goodbye illustration"
                    className="max-h-64 object-contain"
                  />
                </div>
              </div>

              {/* Button */}
              {definition_name &&
                <div className="flex items-center py-6 gap-2 flex-col">
                  <Button
                    onClick={handleTriggerChat}
                    size="md"
                    bgColor="blue-500"
                    className="hover:bg-blue-600"
                  >
                    INITIATE SEPARATION
                  </Button>

                  <Button
                    size="md"
                    bgColor="black"
                    className="hover:bg-gray-900"
                  >
                    Terminate
                  </Button>
                </div>
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Separation;
