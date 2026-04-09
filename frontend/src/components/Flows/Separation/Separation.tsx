/* eslint-disable @typescript-eslint/no-explicit-any */
import { AlertCircle } from "lucide-react";
import image from "../../../assets/welcome-sep.svg";
import {
  useCurrentEmployeeAllDetails,
  useEmployee,
} from "../../../hooks/useEmployee";
import {
  useChatAssistantLazy,
  useDifinitaionNameForSeparation,
} from "../../../hooks/useFlows";
import Button from "../../shared/atoms/Button";
import ApprovalTracker from "./components/ApprovalTracker";
import { useTargetUser } from "../../../context/ViewedUserContext";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Typography } from "../../shared/atoms/Typography";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { SeparationSvgs } from "./consts";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { SeparationSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import { getActionsEnabled } from "../../../utils/uiPermission";
import { useQueryClient } from "@tanstack/react-query";
import { useGetSeparationFunnelDetails } from "../../../hooks/useSeparation";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { FlowRequestItem } from "../../../types/flows";

type cardDataType = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

const SeparationCard = ({ data }: { data: cardDataType }) => {
  return (
    <div className="w-full sm:max-w-[250px] items-center border-1 hover:bg-gray-10 cursor-pointer  p-4 rounded-lg flex">
      <div className="shrink-0">{data.icon}</div>
      <div>
        <Typography variant="body">{data.label}</Typography>
        <Typography variant="bodySmall" color="body2">
          {data.value}
        </Typography>
      </div>
    </div>
  );
};

const Separation = () => {
  const { data: currentEmployee } = useCurrentEmployeeAllDetails({
    fields: ["name", "notice_number_of_days"]
  });
  const doctype_name = "Employee";
  const { targetEmployeeId, isViewingOtherUser } = useTargetUser();
  const { data: targetEmployee } = useEmployee(targetEmployeeId);
  const activeEmployee = isViewingOtherUser ? targetEmployee : currentEmployee;
  const document_name = activeEmployee?.name ?? "";
  const { data: definitionName } = useDifinitaionNameForSeparation();

  const { data: userUiPermission } = useGetUiPermission("HR Process");
  const enabledActions = getActionsEnabled(
    userUiPermission,
    ["view_workflow", "initiate_separation", "terminate"],
    "Separation",
  );


  const {
    data: separationFunnelDetails,
    refetch: refetchSeparationFunnelDetails,
    isLoading: isLoadingSeparationFunnelDetails,
  } = useGetSeparationFunnelDetails();



  const item = separationFunnelDetails?.data?.[0];
  const isLoading = isLoadingSeparationFunnelDetails;
  const [isTriggeringChat, setIsTriggeringChat] = useState(false);

  function getFunnelData() {
    const result: any = {
      termination_funnel_data: null,
      separation_funnel_data: null,
    };

    if (!Array.isArray(definitionName)) return result;

    definitionName.forEach((item: any) => {
      const category = item?.trigger_category?.name;
      if (category === "Termination") result.termination_funnel_data = item;
      if (category === "Separation") result.separation_funnel_data = item;
    });

    return result;
  }

  const { termination_funnel_data, separation_funnel_data } = getFunnelData();

  const l = "true";

  const { mutateAsync: fetchChatAssistantData } = useChatAssistantLazy();

  const handleTriggerChat = async (For: "Separation" | "Termination") => {
    setIsTriggeringChat(true);

    try {
      const definition_name =
        For === "Separation"
          ? separation_funnel_data?.name
          : termination_funnel_data?.name;

      if (!definition_name) {
        throw new Error("Missing funnel data for " + For);
      }

      const data = await fetchChatAssistantData({
        doctype_name,
        document_name,
        definition_name,
        l,
      });

      const maxAttempts = 50; // 5 seconds max (50 * 100ms)
      let attempts = 0;

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
          console.warn(
            "⚠️ trigger_chatnext_assistant is not available on window after 5 seconds.",
          );
          setIsTriggeringChat(false);
        }
      };

      checkAndTrigger();
    } catch (e) {
      console.error("Failed to trigger chat:", e);
      setIsTriggeringChat(false);
    }
  };

  const showTerminationButton =
    isViewingOtherUser &&
    !!termination_funnel_data?.name &&
    enabledActions.terminate;
  const showSeparationButton =
    !!separation_funnel_data?.name && enabledActions.initiate_separation;

  const cardData: cardDataType[] = [
    {
      icon: SeparationSvgs[0],
      label: "Notice Period",
      value: `Remember to serve your notice period ${(activeEmployee as any)?.notice_number_of_days ? "of " + (activeEmployee as any)?.notice_number_of_days + " days" : ""}`,
    },
    {
      icon: SeparationSvgs[1],
      label: "Final Settlement",
      value: `We'll process your full & final settlement soon`,
    },
  ];
  const queryClient = useQueryClient();
  useEffect(() => {
    const handleChatClose = () => {
      refetchSeparationFunnelDetails()
      queryClient.invalidateQueries({ queryKey: ["separation-workflow"] });
      queryClient.invalidateQueries({ queryKey: ["employee", activeEmployee?.name] });
    };

    document.addEventListener("chatnext:modal:chat:close", handleChatClose);

    return () => {
      document.removeEventListener(
        "chatnext:modal:chat:close",
        handleChatClose,
      );
    };
  }, [refetchSeparationFunnelDetails, queryClient, activeEmployee?.name]);


  const navigate = useNavigate();
  const handleShowWorkflow = () => {
    navigate(
      "/webapp/flow-app/separation-workflow",
    );
  };


  const showRequestPage = useMemo(() => {
    if (!item) return false;
    if (item.approval_status === "Rejected") {
      return false;
    }
    return true;
  }, [item]);

  const showRejectStatus = item && item?.approval_status === "Rejected";


  const canViewWorkflow = useMemo(() => {
    if (!showRequestPage) return false;
    if (!separationFunnelDetails?.data?.[0]) return false;
    if (separationFunnelDetails?.data?.[0].workflow_stages?.length === 0) return false;
    if (!enabledActions.view_workflow) return false;
    return true;
  }, [separationFunnelDetails, enabledActions, showRequestPage])

  const { isDesktop } = useScreenSize();
  /* -------------------- LOADING Skeleton -------------------- */
  if (isLoading) {
    return <SeparationSkeleton />;
  }
  /* ---------------------------------------------------------- */

  return (
    <div className="min-h-screen md:p-4 md:gap-4">
      <div className="flex items-baseline">
        <div className="flex flex-col md:mb-4 max-md:px-4">
          {isDesktop && <Typography variant="h4">Separation</Typography>}
          <Typography variant="bodySmall" color="body2">
            View Your Separation Process
          </Typography>
        </div>
        {canViewWorkflow && (
          <Button
            onClick={handleShowWorkflow}
            size="md"
            bgColor="primary"
            className="hover:bg-primary my-2 text-white ml-auto mr-4"
          >
            View Workflow
          </Button>
        )}
      </div>
      {showRequestPage ? (
        <main className="min-h-full mb-2">
          <div className="max-w-full">
            <ApprovalTracker For="Employee Separation" data={item as FlowRequestItem} />
          </div>
        </main>
      ) : (
        <div className="min-h-screen">
          <div className="flex items-center justify-between"></div>
          <div className="bg-white rounded-xl shadow-sm w-full max-w-full overflow-hidden">
            {/* Main content */}
            <div className="flex flex-col md:flex-row items-center justify-between">
              {/* Left Section */}
              <div className="flex-1 p-6 md:p-12">
                <Typography color="primary" variant={isDesktop ? "h1" : "h3"}>
                  We are sad to see you leave
                </Typography>
                <Typography variant="bodyMedium" color="body2" className="mt-1">
                  Please connect with your HBRP once before taking this step
                </Typography>

                <div className="flex flex-wrap gap-2 mt-4">
                  {cardData.map((data) => (
                    <SeparationCard key={data.label} data={data} />
                  ))}
                </div>
              </div>

              {/* Right Section */}
              <div className="flex-1 flex justify-center md:p-10 p-5">
                <img
                  src={image}
                  alt="Goodbye illustration"
                  className="max-h-80 object-contain"
                />
              </div>
            </div>
          </div>
          {/* Button */}

          {showRejectStatus &&
            <div className="flex w-full mt-4 mb-2">
              <div className="flex flex-col sm:flex-row items-center w-full bg-red-50 border border-red-100 p-4 rounded-xl gap-3 text-center sm:text-left shadow-sm">
                <div className="bg-red-100 p-2 rounded-full shrink-0 text-red-500">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <Typography variant="bodyMedium" color="body1" className="text-red-800">
                    Your separation request initiated on <span className="font-semibold">{formatToIndianDate(item?.initiated_on)}</span> has been <Link to="/webapp/flow-app/rejected-separation-request" className="font-semibold text-red-600 hover:text-red-700 underline decoration-red-300 underline-offset-4 transition-colors">Rejected</Link>.
                  </Typography>
                </div>
              </div>
            </div>
          }

          <div className="flex items-center py-6 gap-2 flex-col">
            {showSeparationButton && (
              <Button
                onClick={() => handleTriggerChat("Separation")}
                size="md"
                bgColor="blue-500"
                className="hover:bg-blue-600 text-white"
                loading={isTriggeringChat}
                disabled={isTriggeringChat}
              >
                Initiate Separation
              </Button>
            )}

          </div>
        </div>
      )}
      {showTerminationButton && (
        <Button
          onClick={() => handleTriggerChat("Termination")}
          size="md"
          bgColor="black"
          className="hover:bg-gray-900 text-white"
          loading={isTriggeringChat}
          disabled={isTriggeringChat}
        >
          Terminate
        </Button>
      )}
    </div>
  );
};

export default Separation;
