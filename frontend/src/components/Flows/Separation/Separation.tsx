/* eslint-disable @typescript-eslint/no-explicit-any */
import { CircleIcon, Loader2 } from "lucide-react";
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
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Typography } from "../../shared/atoms/Typography";
import { useScreenSize } from "../../../hooks/useScreenSize";

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
  const [isTriggeringChat, setIsTriggeringChat] = useState(false);

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

  useEffect(() => {
    refetchConfirmationAndSeparation();
  }, [refetchConfirmationAndSeparation, isViewingOtherUser]);

  const { data } = useChatAssistant(
    doctype_name,
    document_name,
    definition_name,
    l
  );

  const handleTriggerChat = () => {
    const maxAttempts = 50; // 5 seconds max (50 * 100ms)
    let attempts = 0;
    setIsTriggeringChat(true);

    const checkAndTrigger = () => {
      if (
        typeof window !== "undefined" &&
        typeof window.trigger_chatnext_assistant === "function"
      ) {
        window.trigger_chatnext_assistant(true, data?.session);
        setIsTriggeringChat(false);
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkAndTrigger, 100);
      } else {
        console.warn("⚠️ trigger_chatnext_assistant is not available on window after 5 seconds.");
        setIsTriggeringChat(false);
      }
    };

    checkAndTrigger();
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

  const allStagesComplete =
    item?.approval_stages_status?.every(
      (stage) => stage.status === "Approved"
    ) ?? false

  const Rejected =
    item?.approval_stages_status?.some(
      (stage) => stage.status === "Rejected"
    ) ?? false;

  const pendingCount =
    item?.approval_stages_status?.filter((s) => s.status === "Pending").length ?? 0

  const separationStatus = allStagesComplete ? "Approved" : Rejected ? "Rejected" : "Pending";

  const BannerForCurrentStatus = useMemo(() => {
    if (separationStatus === "Approved")
      return {
        color: "bg-green-100 border border-green-500 ",
        description: "Separation is approved.",
        button: null,
        dotColor: "fill-green-500"
      };
    else if (separationStatus === "Rejected")
      return {
        color: "bg-red-100 border border-red-500 ",
        description: "Separation is rejected.",
        button: null,
        dotColor: "fill-red-500"
      };
    else
      return {
        color: "bg-yellow-100 border border-yellow-500 ",
        description: "Separation is currently in progress.",
        button: null,
        dotColor: "fill-yellow-500"
      };
  }, [separationStatus]);
  const { isDesktop } = useScreenSize();
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
      <div className="min-h-screen p-4 gap-4 bg-blue-50">
        {!showInitiatePage ? (
          <main className="min-h-full mb-2">
            <div className={`flex text-white justify-between w-full rounded-lg border mb-2 items-center px-2 
                ${BannerForCurrentStatus.color}
              `}>
              <div className="flex items-center py-2">
                <CircleIcon className={`h-3 w-3 ${BannerForCurrentStatus.dotColor} mr-2`} />
                <Typography variant="bodyMedium" color="body1" className="mr-2">
                  {BannerForCurrentStatus.description}
                </Typography>
              </div>
              {separationWorkflow?.show_workflow &&
                <Button
                  onClick={handleShowWorkflow}
                  size="md"
                  bgColor="primary"
                  className="hover:bg-primary my-2 text-white"
                >
                  Show Workflow Activity Log
                </Button>
              }
            </div>
            <div className="max-w-full">
              <ApprovalTracker For="Employee Separation" data={item} />
            </div>
          </main>
        ) : (
          <div className="min-h-screen">
            <div className="flex flex-col mb-4 ">
              <Typography variant="h4">Separation</Typography>
              <Typography variant="bodySmall" color="body2">
                View Your Separation Process
              </Typography>
            </div>
            <div className="flex items-center justify-between">
            </div>
            <div className="bg-white rounded-xl shadow-sm w-full max-w-full overflow-hidden">
              {/* Main content */}
              <div className="flex flex-col md:flex-row items-center justify-between">
                {/* Left Section */}
                <div className="flex-1 p-6 md:p-12">
                  <Typography color="primary" variant={isDesktop ? "h1" : "h3"}>We are sad to see you leave</Typography>
                  <Typography variant="bodyMedium" color="body2" className="mt-1">
                    Please connect with your HBRP once before taking this step
                  </Typography>
                </div>

                {/* Right Section */}
                <div className="flex-1 flex justify-center p-10">
                  <img
                    src={image}
                    alt="Goodbye illustration"
                    className="max-h-80 object-contain"
                  />
                </div>
              </div>

            </div>
            {/* Button */}
            {definition_name &&
              <div className="flex items-center py-6 gap-2 flex-col">
                <Button
                  onClick={handleTriggerChat}
                  size="md"
                  bgColor="blue-500"
                  className="hover:bg-blue-600 text-white"
                  loading={isTriggeringChat}
                  disabled={isTriggeringChat}
                >
                  INITIATE SEPARATION
                </Button>

                <Button
                  size="md"
                  bgColor="black"
                  className="hover:bg-gray-900 text-white"
                  loading={isTriggeringChat}
                  disabled={isTriggeringChat}
                >
                  Terminate
                </Button>
              </div>
            }
          </div>
        )}
      </div>
    </div >
  );
};

export default Separation;
