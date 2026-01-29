/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useCurrentEmployeeAllDetails,
  useEmployee,
} from "../../../hooks/useEmployee";
import {
  useChatAssistant,
  useConfirmationApproval,
  useDifinitaionNameForSeparation,
  useGetShouldShowConfirmationButton,
} from "../../../hooks/useFlows";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import {
  useConfirmation,
  // useConfirmationEmployee,
} from "../../../hooks/useConfiremnation";
import Button from "../../shared/atoms/Button";
import {
  Calendar,
  CalendarCheck,
  Clock,
  FileText,
  Loader2,
} from "lucide-react";
import { useTargetUser } from "../../../context/ViewedUserContext";
import { useCallback, useEffect, useMemo } from "react";
import { Typography } from "../../shared/atoms/Typography";
import { Card } from "../../shared/atoms/Card";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import toast from "react-hot-toast";
import useCurrentUser from "../../../hooks/useCurrentUser";
import StageCard from "./StageCard";
import StatusTimelineItem from "./components/StatusTimelineItem";
import { statusConfig } from "./constants";

const ConfirmationWorkflow = () => {
  const { data: userId } = useLoggedInUser();
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee, isLoading: loadingCurrentEmployee } =
    useCurrentEmployeeAllDetails(userId || "");
  const { targetEmployeeId, isViewingOtherUser } = useTargetUser();
  const { data: targetEmployee } = useEmployee(targetEmployeeId);
  const doctype_name = "Employee";
  const doctype = "Employee Confirmation";
  const document_name = isViewingOtherUser
    ? targetEmployee?.name || ""
    : currentEmployee?.name || "";
  const activeEmployee = isViewingOtherUser ? targetEmployee : currentEmployee;
  const { data: definitionName, refetch } = useDifinitaionNameForSeparation();

  function getFunnelData(trigger_category: string) {
    return Array.isArray(definitionName)
      ? definitionName.filter(
          (item: any) => item?.trigger_category?.name === trigger_category,
        )
      : [];
  }

  const { data: showConfirmatoinButton, isLoading: loadingCardData } =
    useGetShouldShowConfirmationButton(document_name);

  const {
    data: employeeConfirmation,
    isLoading: loadingConfirmationTodo,
    refetch: refetchConfirmationAndSeparation,
  } = useConfirmation(doctype);
  const item = employeeConfirmation?.[0];

  const stages = item?.approval_stages_status;
  const confirmationData = getFunnelData("Confirmation");
  const definition_name = confirmationData?.[0]?.name || "";
  const l = "true";

  const isLoading =
    loadingCardData || loadingConfirmationTodo || loadingCurrentEmployee;

  const { data } = useChatAssistant(
    doctype_name,
    document_name,
    definition_name,
    l,
  );

  const handleInitiateConfirmation = () => {
    const maxAttempts = 500; // 50 seconds max (500 * 100ms)
    let attempts = 0;

    const checkAndTrigger = () => {
      if (
        typeof window !== "undefined" &&
        typeof window.trigger_chatnext_assistant === "function"
      ) {
        window.trigger_chatnext_assistant(true, data?.session);
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkAndTrigger, 100);
      } else {
        console.warn(
          "⚠️ trigger_chatnext_assistant is not available on window after 50 seconds.",
        );
      }
    };

    checkAndTrigger();
  };

  /** Actions for approver actions */

  const mutation = useConfirmationApproval();
  const handleAct = useCallback(
    async (action: { name: string; hasForm: boolean; todo: any }) => {
      try {
        if (mutation?.isPending) return;
        const response = await mutation?.mutateAsync({
          action: action.name,
          name: action?.todo?.todo_id || "",
        });

        console.log("Action response:", response);
        const responseWithSession = response as unknown as { session?: any };
        console.log("Session data:", responseWithSession?.session);
        console.log(
          "Assistant trigger enabled:",
          action?.todo?.custom_open_chatnext_assistant_on_action,
        );

        console.log(
          "Opening assistant with session:",
          responseWithSession?.session,
        );

        if (window.trigger_chatnext_assistant && action.hasForm) {
          window.trigger_chatnext_assistant(true, responseWithSession?.session);
        }

        if (action.name.toLowerCase() !== "approve") {
          // triggerRefetch();
        }

        // Query invalidation now handled by Frappe realtime events
      } catch (error: any) {
        const exceptions = error?.response?.data?.exception?.split(":");
        const errMessage =
          exceptions?.length > 1
            ? exceptions[1] + " " + exceptions[2]
            : exceptions[1];
        console.error("Action failed", error);
        toast.error(errMessage);
      }
    },
    [mutation],
  );

  const canPerformAction = useMemo(() => {
    let actionPermission = false;

    if (!item?.custom_doctype_actions) return false;
    if (item?.allocated_to_emp_id && currentEmployee?.name)
      actionPermission = item.allocated_to_emp_id === currentEmployee.name;

    if (currentUser?.roles && item?.role)
      actionPermission ||= currentUser.roles.some(
        (role) => role.role === item.role,
      );

    return actionPermission;
  }, [item, currentEmployee, currentUser]);

  const allStagesComplted = useMemo(() => {
    return item?.approval_stages_status?.every(
      (stage) => stage.status === "Approved",
    );
  }, [item?.approval_stages_status]);

  const postStagesStarted = Array.isArray(stages) && stages.length > 0;

  const canInitiateConfirmation =
    (!postStagesStarted ||
      (allStagesComplted &&
        item?.reference_document?.status !== "Confirmed")) &&
    showConfirmatoinButton?.show_button;

  useEffect(() => {
    const handleChatClose = () => {
      refetchConfirmationAndSeparation();
      refetch();
    };

    document.addEventListener("chatnext:modal:chat:close", handleChatClose);

    return () => {
      document.removeEventListener(
        "chatnext:modal:chat:close",
        handleChatClose,
      );
    };
  }, [refetchConfirmationAndSeparation, refetch]);

  const confirmationCards = useMemo(
    () => [
      {
        label: "Date of Joining",
        value: formatToIndianDate(activeEmployee?.date_of_joining || ""),
        Icon: Calendar,
        bg: "bg-blue-50",
        text: "text-blue-600",
      },
      {
        label: "Probation End Date",
        value: formatToIndianDate(
          activeEmployee?.final_confirmation_date || "",
        ),
        Icon: CalendarCheck,
        bg: "bg-green-50",
        text: "text-green-600",
      },
      ...(item?.reference_document?.creation
        ? [
            {
              label: "Trigger Date",
              value: formatToIndianDate(item.reference_document.creation),
              Icon: Clock,
              bg: "bg-orange-50",
              text: "text-orange-600",
            },
          ]
        : []),
      ...(item?.reference_document?.creation
        ? [
            {
              label: "Status",
              value:
                item?.reference_document?.status === "Draft"
                  ? "Review Pending"
                  : item?.reference_document?.status,
              Icon: FileText,
              bg: "bg-purple-50",
              text: "text-purple-600",
            },
          ]
        : []),
    ],
    [activeEmployee, item],
  );

  const timelineData = [
    {
      id: 1,
      title: "Date of Joining",
      description: "Initial onboarding process started",
      time: formatToIndianDate(activeEmployee?.date_of_joining || ""),
      status: "completed",
    },
    {
      id: 2,
      title: "Employee Self Form Submission",
      description: "Please submit all required fields",
      time: formatToIndianDate(item?.reference_document?.creation || ""),
      status: showConfirmatoinButton?.show_button
        ? "action_required"
        : "pending",
      show_confirmation_button: canInitiateConfirmation,
    },
  ];

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
    <div className=" bg-blue-50  min-h-screen  p-4  text-gray-800  font-sans">
      <div className="flex flex-col mb-4 ">
        <Typography variant="h4">Confirmation</Typography>
        <Typography variant="bodySmall" color="body2">
          View Your Confirmation Process
        </Typography>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Confirmation Cards Section */}
          {confirmationCards.map(({ label, value, Icon, bg, text }, index) => (
            <div
              key={index}
              className="flex items-center gap-4 px-4 py-8 bg-white border border-slate-200 hover:border-primary rounded-xl shadow-sm"
            >
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-lg ${bg} ${text}`}
              >
                <Icon size={20} strokeWidth={1.75} />
              </div>

              <div className="space-y-0.5">
                <Typography variant="bodyMedium" className="font-semibold">
                  {value || "-"}
                </Typography>
                <Typography variant="bodySmall">{label}</Typography>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Workflow Section  */}
      <Card className="mt-4">
        <Typography variant="subheading">
          Confirmation Workflow Timeline
        </Typography>

        {/* TimelineDummy  */}
        {timelineData.map((item, idx) => {
          const isLast = idx === timelineData.length - 1 && !postStagesStarted;
          const status = postStagesStarted ? "completed" : item.status;
          return (
            <div
              className="grid grid-cols-[80px_1fr] hover:bg-primary-10"
              key={item.id}
            >
              <StatusTimelineItem
                isLast={isLast}
                status={status as keyof typeof statusConfig}
              />

              <div className="grid lg:grid-cols-2 grid-cols-1 py-2">
                <div className="ml-4 flex flex-col">
                  <Typography variant="subheading">{item.title}</Typography>
                  <Typography variant="bodySmall">
                    {item.description}
                  </Typography>
                </div>

                <div className="flex justify-between items-start px-4 pt-1 pb-3">
                  {item.show_confirmation_button ? (
                    <Button
                      variant="contain"
                      size="md"
                      onClick={handleInitiateConfirmation}
                    >
                      Act
                    </Button>
                  ) : (
                    <div></div>
                  )}

                  <div>{item.time}</div>
                </div>
              </div>
            </div>
          );
        })}
        {/* Approval Stages Timeline  */}
        {stages?.map((_, idx) => (
          <div className="grid grid-cols-[80px_1fr] hover:bg-primary-10">
            <StageCard
              handleAct={handleAct}
              canPerformAction={canPerformAction}
              key={stages[idx].stage_name}
              stages={stages}
              idx={idx}
              item={item}
            />
          </div>
        ))}
      </Card>
    </div>
  );
};

export default ConfirmationWorkflow;
