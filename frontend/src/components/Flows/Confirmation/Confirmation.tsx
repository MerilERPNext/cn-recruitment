/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useCurrentEmployeeDetails,
  useEmployee,
} from "../../../hooks/useEmployee";
import {
  useChatTrigger,
  useDifinitaionNameForSeparation,
  useGetShouldShowConfirmationButton,
  useGetShouldShowSeparationButton,
  getDefinitionByFilter,
} from "../../../hooks/useFlows";
import {
  useConfirmation,
  // useConfirmationEmployee,
} from "../../../hooks/useConfiremnation";
import Button from "../../shared/atoms/Button";
import { Calendar, CalendarCheck, Clock, FileText } from "lucide-react";
import { useTargetUser } from "../../../context/ViewedUserContext";
import { useEffect, useMemo, useCallback, useState } from "react";
import { Typography } from "../../shared/atoms/Typography";
import { Card } from "../../shared/atoms/Card";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import StageCard from "./StageCard";
import StatusTimelineItem from "./components/StatusTimelineItem";
import { statusConfig } from "./constants";
import ConfirmationStateCard from "./components/ConfirmationStateCard";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { ConfirmationSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import { getActionsEnabled } from "../../../utils/uiPermission";
import ReviewForm from "../Separation/components/ReviewForm";
import { createPortal } from "react-dom";
import ViewFormButton from "../ViewFormButton";
import { FormIOComponent } from "../../../types/formio";
import { useApprovalAction } from "../../../hooks/userApprovalList";
import FormPreview from "../../shared/molecules/FormPreview";
import ActivityLogDrawer from "../../shared/ActivityLogDrawer";
import type { FlowRequestItem } from "../../../types/flows";

const ConfirmationWorkflow = () => {
  const { isDesktop } = useScreenSize();
  const {
    data: currentEmployee,
    isLoading: loadingCurrentEmployee,
    refetch: refetchCurrentEmployee,
  } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { targetEmployeeId, isViewingOtherUser } = useTargetUser();
  const { data: targetEmployee, refetch: refetchTargetEmployee } =
    useEmployee(targetEmployeeId);
  const doctype_name = "Employee";
  const doctype = "Employee Confirmation";
  const document_name = isViewingOtherUser
    ? targetEmployee?.name || ""
    : currentEmployee?.name || "";
  const activeEmployee = isViewingOtherUser ? targetEmployee : currentEmployee;
  const { data: definitionName, refetch } = useDifinitaionNameForSeparation();

  // Derive definition names for Confirmation and Separation triggers from the full data
  const confirmationDefinition = useMemo(
    () => getDefinitionByFilter(definitionName, { triggerCategory: "Confirmation" }),
    [definitionName],
  );
  const separationDefinition = useMemo(
    () =>
      getDefinitionByFilter(definitionName, {
        triggerCategory: "Confirmation",
        buttonLabel: "Recommend for Separation",
      }),
    [definitionName],
  );

  const definition_name = confirmationDefinition?.name || "";

  // action buttons permission
  const { data: userUiPermission } = useGetUiPermission("HR Process");
  const enabledActions = getActionsEnabled(
    userUiPermission,
    ["act_confirmation", "initiate_confirmation"],
    "Confirmation",
  );

  // END action buttons permission

  const {
    data: showConfirmationButton,
    isLoading: loadingCardData,
    refetch: refetchShowConfirmationButton,
  } = useGetShouldShowConfirmationButton(document_name);

  const { data: separationData } = useGetShouldShowSeparationButton();

  const {
    data: employeeConfirmationAll,
    isLoading: loadingConfirmationTodo,
    refetch: refetchConfirmationAndSeparation,
  } = useConfirmation(doctype);

  const employeeConfirmationPending = useMemo(
    () =>
      (employeeConfirmationAll ?? []).filter((i) =>
        ["Pending", "Draft"].includes(i?.approval_status ?? ""),
      ),
    [employeeConfirmationAll],
  );

  const employeeConfirmationClosed = useMemo(
    () =>
      (employeeConfirmationAll ?? []).filter((i) =>
        ["Completed", "Approved", "Rejected"].includes(i?.approval_status ?? ""),
      ),
    [employeeConfirmationAll],
  );

  const item = employeeConfirmationPending?.[0] || employeeConfirmationClosed?.[0];

  const stages = item?.approval_stages;
  console.log(item);

  const l = "true";

  const isLoading =
    loadingCardData ||
    loadingConfirmationTodo ||
    loadingCurrentEmployee ||
    false;

  // Centralized chat trigger for both Confirmation and Separation
  const { triggerChat, isTriggeringChat } = useChatTrigger("Loading confirmation form...");

  const [showSelfInitForm, setShowSelfInitForm] = useState<boolean>(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const selfInitFormAndAns = useMemo(
    () => {
      const raw = item?.initiator_forms?.[0]?.form_data;
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return {
          form: parsed?.form,
          answer: parsed?.submission_data ?? parsed?.answer,
        };
      } catch {
        return null;
      }
    },
    [item],
  );

  const [formSchema, setFormSchema] = useState<{ display: string; components: FormIOComponent[] } | null>(null);
  const [formAnswer, setFormAnswer] = useState<Record<string, any>>({});
  const handleShowForm = () => {
    const schema: FormIOComponent[] = selfInitFormAndAns?.form?.components;
    const answer = selfInitFormAndAns?.answer;

    if (!schema) return;
    setFormSchema({ display: "form", components: schema });
    setFormAnswer(answer || {});
    setShowSelfInitForm(true);
  };

  const handleInitiateConfirmation = useCallback(() => {
    if (!definition_name) return;
    triggerChat({ doctype_name, document_name, definition_name, l });
  }, [triggerChat, doctype_name, document_name, definition_name, l]);

  const handleSeparationClick = useCallback(() => {
    const sepDefName = separationDefinition?.name;
    if (!sepDefName) return;
    triggerChat({ doctype_name, document_name, definition_name: sepDefName, l });
  }, [triggerChat, doctype_name, document_name, separationDefinition, l]);

  /** Actions for approver actions */

  const { handleAction } = useApprovalAction();

  const handleAct = async (action: {
    name: string;
    hasForm: boolean;
    todoId: string;
    customApprovalType?: "Approval Matrix" | "Multi Actions";
  }) => {
    handleAction(action.name, {
      todo_id: action.todoId,
      custom_open_chatnext_assistant_on_action: action.hasForm,
      custom_approval_type: action.customApprovalType ?? "Approval Matrix",
    });
  };



  const postStagesStarted = Array.isArray(stages) && stages.length > 0;

  const canInitiateConfirmation =
    enabledActions.initiate_confirmation &&
    showConfirmationButton?.show_button &&
    !employeeConfirmationPending?.[0] &&
    activeEmployee?.custom_employment_status == "On Probation";

  useEffect(() => {
    const refreshCurrentPageData = () => {
      refetchCurrentEmployee();
      refetchTargetEmployee();
      refetch();
      refetchConfirmationAndSeparation();
      refetchShowConfirmationButton();
    };

    const handleChatClose = () => {
      refreshCurrentPageData();
    };

    document.addEventListener("chatnext:modal:chat:close", handleChatClose);

    return () => {
      document.removeEventListener(
        "chatnext:modal:chat:close",
        handleChatClose,
      );
    };
  }, [
    refetchCurrentEmployee,
    refetchTargetEmployee,
    refetch,
    refetchConfirmationAndSeparation,
    refetchShowConfirmationButton,
  ]);


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
      ...(item?.initiated_on
        ? [
          {
            label: "Trigger Date",
            value: formatToIndianDate(item.initiated_on),
            Icon: Clock,
            bg: "bg-orange-50",
            text: "text-orange-600",
          },
        ]
        : []),
      {
        label: "Status",
        value: activeEmployee?.custom_employment_status,
        Icon: FileText,
        bg: "bg-purple-50",
        text: "text-purple-600",
      },
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
      time: formatToIndianDate(item?.initiated_on || ""),
      status: showConfirmationButton?.show_button
        ? "action_required"
        : "pending",
      show_confirmation_button:
        canInitiateConfirmation,
      self_confirmation_btn_name: "Initiate Confirmation",
      show_view_form_btn: !!selfInitFormAndAns,
    },
  ];

  /* -------------------- LOADING Skeleton -------------------- */
  if (isLoading) {
    return <ConfirmationSkeleton />;
  }
  /* ---------------------------------------------------------- */

  const funnelActivityId = item?.request_id || "";
  const canActOnThisRequest = Boolean(
    (item as FlowRequestItem | undefined)?.approval_stages?.some((s) => s?.todo?.custom_doctype_actions),
  );

  return (
    <div className=" md:bg-blue-50  min-h-screen sm:p-4  text-gray-800  font-sans">
      <div className="flex items-start justify-between gap-3 md:mb-4 p-2">
        <div className="flex flex-col">
          {isDesktop && <Typography variant="h4">Confirmation</Typography>}
          <Typography variant="bodySmall" color="body2">
            View Your Confirmation Process
          </Typography>
        </div>

        <div className="flex items-center gap-2">
          {separationData?.show_button && (
            <Button
              variant="contain"
              size="md"
              onClick={handleSeparationClick}
            >
              Separation
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setIsActivityLogOpen(true)}
            className="flex items-center gap-2 py-1.5 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all rounded-md shadow-sm"
            disabled={!funnelActivityId}
          >
            Activity Log
          </Button>
        </div>
      </div>

      <ActivityLogDrawer
        open={isActivityLogOpen}
        onClose={() => setIsActivityLogOpen(false)}
        funnelActivityId={funnelActivityId}
        title="Activity Log"
        size="xxl"
      />

      <Card>
        <div className="max-md:bg-blue-50 rounded-lg p-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Confirmation Cards Section */}
          {confirmationCards.map((data, index) => (
            <ConfirmationStateCard key={index} data={data} />
          ))}
        </div>
      </Card>

      {/* Workflow Section  */}
      <Card className="mt-4">
        <Typography variant="subheading">
          {(item?.category && item.category === "Recommend for Separation") ? "Recommend for Separation " : "Confirmation "}Workflow Timeline
        </Typography>

        {/* TimelineDummy  */}
        {timelineData.map((td, idx) => {
          const isLast = idx === timelineData.length - 1 && !postStagesStarted;
          const status = postStagesStarted ? "completed" : td.status;
          return (
            <div
              className="grid sm:grid-cols-[80px_1fr] grid-cols-[30px_1fr] hover:bg-primary-10"
              key={td.id}
            >
              <StatusTimelineItem
                isLast={isLast}
                status={status as keyof typeof statusConfig}
              />

              <div className="grid lg:grid-cols-2 grid-cols-1 py-2">
                <div className="ml-4 flex flex-col">
                  <Typography variant="bodyMedium">{td.title}</Typography>
                  <Typography variant="bodySmall">
                    {td.description}
                  </Typography>
                </div>

                <div className="flex justify-between max-lg:flex-row-reverse items-start px-4 pt-1 pb-3">
                  {td?.show_view_form_btn && (
                    <ViewFormButton onClick={() => handleShowForm()} />
                  )}
                  {td.show_confirmation_button ? (
                    <Button
                      variant="contain"
                      size="md"
                      onClick={handleInitiateConfirmation}
                      loading={isTriggeringChat}
                      disabled={isTriggeringChat}
                    >
                      {(td as any)?.self_confirmation_btn_name}
                    </Button>
                  ) : (
                    <div></div>
                  )}
                  <div>{td.time}</div>
                </div>
              </div>
            </div>
          );
        })}
        {/* Approval Stages Timeline  */}
        {stages?.map((_, idx) => (
          <div className="grid sm:grid-cols-[80px_1fr] grid-cols-[30px_1fr] hover:bg-primary-10">
            <StageCard
              handleAct={handleAct}
              showActButton={enabledActions.act_confirmation}
              key={stages[idx].stage_name}
              stages={stages}
              idx={idx}
              canActOnThisRequest={canActOnThisRequest}
            />
          </div>
        ))}
      </Card>

      {formSchema &&
        showSelfInitForm &&
        createPortal(
          <ReviewForm onClose={() => setShowSelfInitForm(false)}>
            <FormPreview
              containerId="confirmation-initiation-form-preview"
              schema={formSchema}
              submissionData={formAnswer}
              readOnly={true}
            />
          </ReviewForm>,
          document.body,
        )}
    </div>
  );
};

export default ConfirmationWorkflow;
