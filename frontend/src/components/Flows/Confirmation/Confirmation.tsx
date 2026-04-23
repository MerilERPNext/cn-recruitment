/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useCurrentEmployeeAllDetails,
  useEmployee,
} from "../../../hooks/useEmployee";
import {
  useChatAssistantLazy,
  useDifinitaionNameForSeparation,
  useGetShouldShowConfirmationButton,
} from "../../../hooks/useFlows";
import {
  useConfirmation,
  // useConfirmationEmployee,
} from "../../../hooks/useConfiremnation";
import Button from "../../shared/atoms/Button";
import { Calendar, CalendarCheck, Clock, FileText } from "lucide-react";
import { useTargetUser } from "../../../context/ViewedUserContext";
import { useEffect, useMemo, useState } from "react";
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
import { TodoType } from "../../../types/todos";
import { useLoadingOverlay } from "../../../context/OverlayContext";
import FormPreview from "../../shared/molecules/FormPreview";

const ConfirmationWorkflow = () => {
  const { isDesktop } = useScreenSize();
  const {
    data: currentEmployee,
    isLoading: loadingCurrentEmployee,
    refetch: refetchCurrentEmployee,
  } = useCurrentEmployeeAllDetails();
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

  function getFunnelData(trigger_category: string) {
    return Array.isArray(definitionName)
      ? definitionName.filter(
        (item: any) => item?.trigger_category?.name === trigger_category,
      )
      : [];
  }

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

  const {
    data: employeeConfirmationPending,
    isLoading: loadingConfirmationTodo,
    refetch: refetchConfirmationAndSeparation,
  } = useConfirmation(doctype, "Open");
  const {
    data: employeeConfirmationClosed,
    isLoading: loadingConfirmationClosed,
    refetch: refetchConfirmationAndSeparationClosed,
  } = useConfirmation(doctype, "Closed");
  const item =
    employeeConfirmationPending?.[0] || employeeConfirmationClosed?.[0];

  const stages = item?.approval_stages_status;

  const confirmationData = getFunnelData("Confirmation");
  const definition_name = confirmationData?.[0]?.name || "";
  const l = "true";

  const isLoading =
    loadingCardData ||
    loadingConfirmationTodo ||
    loadingCurrentEmployee ||
    loadingConfirmationClosed;

  const { mutateAsync: fetchChatAssistantData } = useChatAssistantLazy();
  const [isTriggeringChat, setIsTriggeringChat] = useState(false);
  const loading = useLoadingOverlay();

  useEffect(() => {
    if (isTriggeringChat) {
      loading.show("Loading confirmation form...");
    } else {
      loading.hide();
    }
  }, [isTriggeringChat, loading]);

  const [showSelfInitForm, setShowSelfInitForm] = useState<boolean>(false);
  const selfInitFormAndAns = useMemo(
    () =>
      item?.reference_document?.initiator_form
        ? JSON.parse(item?.reference_document?.initiator_form)
        : null,
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

  const handleInitiateConfirmation = async () => {
    setIsTriggeringChat(true);
    try {
      const data = await fetchChatAssistantData({
        doctype_name,
        document_name,
        definition_name,
        l,
      });

      const maxAttempts = 500; // 50 seconds max (500 * 100ms)
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
            "⚠️ trigger_chatnext_assistant is not available on window after 50 seconds.",
          );
          setIsTriggeringChat(false);
        }
      };

      checkAndTrigger();
    } catch (error) {
      console.error("Failed to trigger chat assistant:", error);
      setIsTriggeringChat(false);
    }
  };

  /** Actions for approver actions */

  const { handleAction } = useApprovalAction();

  const handleAct = async (action: {
    name: string;
    hasForm: boolean;
    todo: TodoType;
  }) => {
    handleAction(action.name, {
      todo_id: action.todo?.todo_id,
      custom_open_chatnext_assistant_on_action: action.hasForm,
      custom_approval_type: action.todo?.custom_approval_type,
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
      refetchConfirmationAndSeparationClosed();
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
    refetchConfirmationAndSeparationClosed,
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
      time: formatToIndianDate(item?.reference_document?.creation || ""),
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

  return (
    <div className=" md:bg-blue-50  min-h-screen sm:p-4  text-gray-800  font-sans">
      <div className="flex flex-col md:mb-4 p-2">
        {isDesktop && <Typography variant="h4">Confirmation</Typography>}
        <Typography variant="bodySmall" color="body2">
          View Your Confirmation Process
        </Typography>
      </div>

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
          Confirmation Workflow Timeline
        </Typography>

        {/* TimelineDummy  */}
        {timelineData.map((item, idx) => {
          const isLast = idx === timelineData.length - 1 && !postStagesStarted;
          const status = postStagesStarted ? "completed" : item.status;
          return (
            <div
              className="grid sm:grid-cols-[80px_1fr] grid-cols-[30px_1fr] hover:bg-primary-10"
              key={item.id}
            >
              <StatusTimelineItem
                isLast={isLast}
                status={status as keyof typeof statusConfig}
              />

              <div className="grid lg:grid-cols-2 grid-cols-1 py-2">
                <div className="ml-4 flex flex-col">
                  <Typography variant="bodyMedium">{item.title}</Typography>
                  <Typography variant="bodySmall">
                    {item.description}
                  </Typography>
                </div>

                <div className="flex justify-between max-lg:flex-row-reverse items-start px-4 pt-1 pb-3">
                  {item?.show_view_form_btn && (
                    <ViewFormButton onClick={() => handleShowForm()} />
                  )}
                  {item.show_confirmation_button ? (
                    <Button
                      variant="contain"
                      size="md"
                      onClick={handleInitiateConfirmation}
                      loading={isTriggeringChat}
                      disabled={isTriggeringChat}
                    >
                      {item.self_confirmation_btn_name}
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
          <div className="grid sm:grid-cols-[80px_1fr] grid-cols-[30px_1fr] hover:bg-primary-10">
            <StageCard
              handleAct={handleAct}
              showActButton={enabledActions.act_confirmation}
              key={stages[idx].stage_name}
              stages={stages}
              idx={idx}
              item={item}
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
