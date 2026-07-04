/* eslint-disable @typescript-eslint/no-explicit-any */
import { CheckCircle2, Clock, MoreVertical, XCircle, FileText, Eye } from "lucide-react";
import image from "../../../assets/welcome-sep.svg";
import {
  useCurrentEmployeeDetails,
  useEmployee,
} from "../../../hooks/useEmployee";
import {
  useChatTrigger,
  useDifinitaionNameForSeparation,
  getDefinitionByFilter,
  useGetFlowRequestById,
} from "../../../hooks/useFlows";
import Button from "../../shared/atoms/Button";
import RetriggerButton from "../RetriggerButton";
import ApprovalTracker from "./components/ApprovalTracker";
import SeparationRecordLog from "./components/SeparationRecordLog";
import { useTargetUser } from "../../../context/ViewedUserContext";
import { useEffect, useMemo, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Typography } from "../../shared/atoms/Typography";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { SeparationSvgs } from "./consts";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { SeparationSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import { getActionsEnabled } from "../../../utils/uiPermission";
import { useQueryClient } from "@tanstack/react-query";
import { useGetEmployeeSeparationType, useGetSeparationFunnelDetails, useGetNoticePeriodAndSeparationPolicy, useRevokeEmployeeSeparation } from "../../../hooks/useSeparation";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { FlowRequestItem } from "../../../types/flows";
import ActivityLogDrawer from "../../shared/ActivityLogDrawer";
import Tooltip from "../../shared/Tooltip";
import DropdownMenu from "../../shared/DropDownMenu";
import RejectionReasonModal from "../../shared/RejectionReasonModal";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import toast from "react-hot-toast";

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
  const { data: currentEmployee, isLoading: isLoadingCurrentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const doctype_name = "Employee";
  const { targetEmployeeId, isViewingOtherUser } = useTargetUser();
  const { data: targetEmployee } = useEmployee(targetEmployeeId);
  const activeEmployee = isViewingOtherUser ? targetEmployee : currentEmployee;
  const document_name = activeEmployee?.name ?? "";
  const { data: definitionName } = useDifinitaionNameForSeparation();

  const { data: userUiPermission } = useGetUiPermission("HR Process");
  const enabledActions = getActionsEnabled(
    userUiPermission,
    [
      "view_workflow",
      "initiate_separation",
      "terminate",
      "retrigger_separation",
      "retrigger_termination",
      "revoke_separation",
    ],
    "Separation",
  );

  const queryClient = useQueryClient();
  const {
    data: separationFunnelDetails,
    refetch: refetchSeparationFunnelDetails,
    isLoading: isLoadingSeparationFunnelDetails,
  } = useGetSeparationFunnelDetails();



  const item = separationFunnelDetails?.data?.[0];
  const { data: flowRequestResponse, isLoading: isLoadingFlowRequest } = useGetFlowRequestById(item?.request_id || "");
  const flowRequestData = flowRequestResponse?.data;

  const separationPending = item?.approval_status === "Pending";

  const reference_name = item?.workflow_stages?.[0]?.todo?.reference_name ?? null;
  const separation_name = item?.approval_stages?.[0]?.todo?.reference_name ?? null;

  const { data: separationType, isLoading: isLoadingSeparationType } = useGetEmployeeSeparationType(reference_name);
  const { data: policyData, isLoading: isLoadingPolicy } = useGetNoticePeriodAndSeparationPolicy(document_name);

  const isTermination = separationType?.custom_resignaion_type === "Termination";
  const canRetrigger = isTermination
    ? enabledActions.retrigger_termination
    : enabledActions.retrigger_separation;


  const hasNoItem = !item;
  const isRevoked = item?.approval_status === "Revoked" || item?.approval_stages?.some((stage => stage?.todo?.reference_document?.custom_status === "Revoked"));
  const isRejected = item?.approval_status === "Rejected";
  const isCompleted = item?.approval_status === "Completed";

  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);

  const showRevokeButton =
    !!separation_name &&
    !!enabledActions.revoke_separation &&
    !isRevoked &&
    item?.approval_status &&
    !["Approved", "Completed", "Rejected", "Cancelled"].includes(item.approval_status);

  // console.log("show Revoke Condition: ", { separation_name, enabledActions: enabledActions.revoke_separation, isRevoked, status: item?.approval_status })

  const { mutate: revokeSeparation, isPending: isRevoking } = useRevokeEmployeeSeparation();

  const handleRevokeSubmit = (reason: string) => {
    if (!separation_name) return;
    revokeSeparation(
      { separation_name: separation_name, reason },
      {
        onSuccess: () => {
          toast.success("Separation request revoked successfully");
          setIsRevokeModalOpen(false);
          refetchSeparationFunnelDetails();
          queryClient.invalidateQueries({ queryKey: ["separation-workflow"] });
          queryClient.invalidateQueries({ queryKey: ["employee", activeEmployee?.name] });
        },
        onError: (error: any) => {
          toast.error(errorResponseFormater(error, "Failed to revoke separation request."));
        },
      }
    );
  };

  const isLoading = isLoadingSeparationFunnelDetails || isLoadingSeparationType || isLoadingPolicy || isLoadingCurrentEmployee || (!!item?.request_id && isLoadingFlowRequest);

  // Use centralized getDefinitionByFilter for finding trigger definitions
  const terminationDefinition = useMemo(
    () => getDefinitionByFilter(definitionName, { triggerCategory: "Termination" }),
    [definitionName],
  );
  const separationDefinition = useMemo(
    () => getDefinitionByFilter(definitionName, { triggerCategory: "Separation" }),
    [definitionName],
  );

  const l = "true";

  // Use centralized chat trigger hook
  const { triggerChat, isTriggeringChat } = useChatTrigger("Loading separation form...");

  const handleTriggerChat = useCallback(
    (For: "Separation" | "Termination") => {
      const definition_name =
        For === "Separation"
          ? separationDefinition?.name
          : terminationDefinition?.name;

      if (!definition_name) {
        console.error("Missing funnel data for " + For);
        return;
      }

      triggerChat({ doctype_name, document_name, definition_name, l });
    },
    [triggerChat, doctype_name, document_name, separationDefinition, terminationDefinition, l],
  );

  const showTerminationButton =
    isViewingOtherUser &&
    !!terminationDefinition?.name &&
    enabledActions.terminate &&
    !separationPending &&
    !isLoadingSeparationType &&
    (!separationType?.custom_resignaion_type ||
      separationType.custom_resignaion_type !== "Termination" || isRejected || isRevoked
    )
    ;


  const showSeparationButton =
    Boolean(separationDefinition?.name) &&
    enabledActions?.initiate_separation &&
    (hasNoItem || isRejected || isRevoked);

  const cardData: cardDataType[] = [
    {
      icon: SeparationSvgs[0],
      label: "Notice Period",
      value: policyData?.notice_period ? `Remember to serve your notice period of ${policyData.notice_period}` : `Remember to serve your notice period ${(activeEmployee as any)?.notice_number_of_days ? "of " + (activeEmployee as any)?.notice_number_of_days + " days" : ""}`,
    },
  ];

  const separationPolicyLabel = policyData?.separation_policy ? "Separation Policy" : "Final Settlement";
  const separationPolicyValue = policyData?.separation_policy || `We'll process your full & final settlement soon`;

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


  const [showRequestPage, setShowRequestPage] = useState(false);

  useEffect(() => {
    if (item && item.approval_status !== "Rejected" && !isRevoked) {
      setShowRequestPage(true);
    } else {
      setShowRequestPage(false);
    }
  }, [item, isRevoked]);

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

  const mobileMenuItems = [];
  if (showRevokeButton) {
    mobileMenuItems.push({
      label: "Revoke Separation",
      onClick: () => setIsRevokeModalOpen(true),
      icon: <XCircle size={16} />,
      className: "text-red-600 hover:bg-red-50 hover:text-red-700",
    });
  }
  if (item?.request_id) {
    mobileMenuItems.push({
      label: "Activity Log",
      onClick: () => setIsActivityLogOpen(true),
      icon: <FileText size={16} />,
      className: "text-gray-700",
    });
  }
  if (canViewWorkflow) {
    mobileMenuItems.push({
      label: "View Workflow",
      onClick: handleShowWorkflow,
      icon: <Eye size={16} />,
      className: "text-gray-700",
    });
  }

  return (
    <div className=" md:p-4 md:gap-4">
      <div className="flex items-center justify-between mb-2 px-4 md:px-0">
        <div className="flex flex-col md:mb-4">
          {isDesktop && <Typography variant="h4">Separation</Typography>}
          <Typography variant="bodySmall" color="body2">
            View Your Separation Process
          </Typography>
        </div>
        {isDesktop ? (
          <div className="flex items-center gap-2">
            {showRevokeButton && (
              <Button
                variant="outline"
                bgColor="error"
                onClick={() => setIsRevokeModalOpen(true)}
                className="flex items-center gap-2 py-1.5 transition-all rounded-md shadow-sm"
                disabled={isRevoking}
              >
                Revoke Separation
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setIsActivityLogOpen(true)}
              className="flex items-center gap-2 py-1.5 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all rounded-md shadow-sm"
              disabled={!item?.request_id}
            >
              Activity Log
            </Button>
            {!!item && canRetrigger && item?.request_id && flowRequestData?.can_reinitiate_flow && (
              <RetriggerButton
                funnelActivityId={item.request_id}
                employeeName={flowRequestData?.initiated_for}
                showRetriggerForText={true}
                flowName="Separation"
              />
            )}
            {canViewWorkflow && (
              <Button
                onClick={handleShowWorkflow}
                size="md"
                bgColor="primary"
                className="hover:bg-primary text-white"
              >
                View Workflow
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center">
            {mobileMenuItems.length > 0 && (
              <DropdownMenu items={mobileMenuItems} placement="bottom-left">
                <button className="p-2 border border-gray-300 focus:bg-primary-100/30 focus:ring-primary focus:ring-2 ring-offset-1 text-gray-700 rounded-md flex items-center justify-center hover:bg-primary-50/30">
                  <MoreVertical size={20} />
                </button>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>
      {!isDesktop && !!item && canRetrigger && item?.request_id && flowRequestData?.can_reinitiate_flow && (
        <div className="px-4 mb-3">
          <RetriggerButton
            funnelActivityId={item.request_id}
            employeeName={flowRequestData?.initiated_for}
            showRetriggerForText={true}
            fullWidth
          />
        </div>
      )}
      <ActivityLogDrawer
        open={isActivityLogOpen}
        onClose={() => setIsActivityLogOpen(false)}
        funnelActivityId={item?.request_id || ""}
        title="Activity Log"
        size="xxl"
      />
      {showRequestPage ? (
        <main className="mb-2">
          <div className="max-w-full">
            <ApprovalTracker
              For={separationType?.custom_resignaion_type === "Termination" ? "Employee Termination" : "Employee Separation"}
              data={item as FlowRequestItem}
              isLoading={isLoading}
            />
          </div>
        </main>
      ) : (
        <div className="">
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
                  <div className="w-full sm:max-w-[250px] items-center border-1 hover:bg-gray-10 cursor-pointer p-4 rounded-lg flex overflow-hidden">
                    <div className="shrink-0">{SeparationSvgs[1]}</div>
                    <div className="min-w-0 flex-1">
                      <Typography variant="body">{separationPolicyLabel}</Typography>
                      {policyData?.separation_policy ? (
                        <Tooltip content={policyData?.separation_policy} position="bottom"
                          triggerClassName="truncate line-clamp-1"
                        >
                          <Typography
                            variant="bodySmall"
                            color="body2"
                            className="truncate block w-full line-clamp-1"
                          >
                            {policyData?.separation_policy}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography variant="bodySmall" color="body2">
                          {separationPolicyValue}
                        </Typography>
                      )}
                    </div>
                  </div>
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

          {item && ["Pending", "Completed", "Approved", "Draft"].includes(item?.approval_status || "") && (
            <div className="flex w-full mt-4 mb-2">
              <div
                className={`flex flex-col sm:flex-row items-center w-full p-4 rounded-xl gap-3 text-center sm:text-left shadow-sm ${item?.approval_status === "Pending" || item?.approval_status === "Draft"
                  ? "bg-amber-50 border border-amber-100"
                  : "bg-emerald-50 border border-emerald-100"
                  }`}
              >
                <div
                  className={`p-2 rounded-full shrink-0 ${item?.approval_status === "Pending"
                    ? "bg-amber-100 text-amber-500"
                    : "bg-emerald-100 text-emerald-500"
                    }`}
                >
                  {item?.approval_status === "Pending" ? (
                    <Clock size={20} />
                  ) : (
                    <CheckCircle2 size={20} />
                  )}
                </div>
                <div>
                  <Typography
                    variant="bodyMedium"
                    color="body1"
                    className={
                      item?.approval_status === "Pending"
                        ? "text-amber-800"
                        : "text-emerald-800"
                    }
                  >
                    Your current separation request initiated on <span className="font-semibold">{formatToIndianDate(item?.initiated_on || "")}</span> is{" "}
                    <button
                      onClick={() => setShowRequestPage(true)}
                      className={`font-semibold underline underline-offset-4 transition-colors ${item.approval_status === "Pending" || item.approval_status === "Draft"
                        ? "text-amber-600 hover:text-amber-700 decoration-amber-300"
                        : "text-emerald-600 hover:text-emerald-700 decoration-emerald-300"
                        }`}
                    >
                      {item.approval_status === "Pending" ? "Pending" : item.approval_status}
                    </button>
                    .
                  </Typography>
                </div>
              </div>
            </div>
          )}

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
      <div className="w-full flex items-center justify-center">
        {showTerminationButton && (
          <Button
            onClick={() => handleTriggerChat("Termination")}
            size="md"
            bgColor="black"
            className="hover:bg-gray-900 text-white mx-auto"
            loading={isTriggeringChat}
            disabled={isTriggeringChat || isCompleted}
          >
            Terminate
          </Button>
        )}
      </div>
      <RejectionReasonModal
        isOpen={isRevokeModalOpen}
        isPending={isRevoking}
        required={false}
        title="Revoke Separation Request"
        description="Are you sure you want to revoke this separation request? Please provide a reason."
        label="Reason for Revocation"
        placeholder="Enter reason for revoking..."
        onCancel={() => setIsRevokeModalOpen(false)}
        onSave={handleRevokeSubmit}
      />

      {!showRequestPage && (
        <SeparationRecordLog
          separationRecords={separationFunnelDetails?.data}
        />
      )}
    </div>
  );
};

export default Separation;
