import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Attachment } from "../../../../types/flows";
import HeaderBar from "../../../HeaderBar";

import { ChevronDown, Eye, Pencil, Save, MoreVertical, FileText, XCircle } from "lucide-react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { useGetFlowRequestById, useUpdateInitiatorFormSubmission, useStartRevokeFlow } from "../../../../hooks/useFlows";
import { useGetUiPermission } from "../../../../hooks/userUiPermission";
import { getActionsEnabled } from "../../../../utils/uiPermission";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import { FormIOComponent } from "../../../../types/formio";
import { FormIOForm } from "../../../../utils/flowUtils";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import Button from "../../../shared/atoms/Button";
import NoDataFound from "../../../shared/atoms/NoDataFound";
import FormPreview from "../../../shared/molecules/FormPreview";
import TableSkeleton, {
  CardSkeleton,
} from "../../../shared/molecules/Skeletons/TableSkeleton";
import ReviewForm from "../../Separation/components/ReviewForm";
import AttachmentPreview from "./AttachmentPreview";
import FlowTable from "./FlowTable";
import WorkflowTable from "./WorkflowTable";
import RevokeDetailsSection from "./RevokeDetailsSection";
import ActivityLogDrawer from "../../../shared/ActivityLogDrawer";
import RetriggerButton from "../../RetriggerButton";

import { useQueryClient } from "@tanstack/react-query";
import DropdownMenu from "../../../shared/DropDownMenu";
import WrapperHoverCard from "../../../shared/WrapperHoverCard";
import toast from "react-hot-toast";
import ActionConfirmationModal from "../../../shared/ActionConfirmationModal";
import { errorResponseFormater } from "../../../../utils/errorResponseFormater";

type JsonToFormData = {
  form?: { components?: FormIOComponent[] };
  submission_data?: Record<string, unknown>;
};

const RequestDetails: React.FC = () => {
  const { id } = useParams();
  const { data: flowResponse, isLoading } = useGetFlowRequestById(id || "");
  const data = flowResponse?.data;

  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();
  const [approvalExpanded, setApprovalExpanded] = useState(false);
  const [workflowExpanded, setWorkflowExpanded] = useState(false);
  const [showSelfForm, setShowSelfForm] = useState(false);
  const [showRevokeForm, setShowRevokeForm] = useState(false);
  const [isEditingForm, setIsEditingForm] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [responseData, setResponseData] = useState<{
    addAttachment?: Attachment[];
  } | null>(null);
  const [formSchema, setFormSchema] = useState<FormIOForm | null>(null);
  const [formAnswer, setFormAnswer] = useState<Record<string, unknown>>({});
  const [revokeFormSchema, setRevokeFormSchema] = useState<FormIOForm | null>(null);
  const [revokeFormAnswer, setRevokeFormAnswer] = useState<Record<string, unknown>>({});
  const [isFormValid, setIsFormValid] = useState(true);
  const [isRequestRevokeModalOpen, setIsRequestRevokeModalOpen] = useState(false);
  const editedSubmissionDataRef = useRef<Record<string, unknown>>({});

  const updateInitiatorMutation = useUpdateInitiatorFormSubmission();
  const startRevokeMutation = useStartRevokeFlow();

  const { data: userUiPermission } = useGetUiPermission("HR Process");
  const enabledActions = getActionsEnabled(
    userUiPermission,
    ["retrigger", "request_revoke"],
    "Flow Requests"
  );
  const canRetrigger = enabledActions.retrigger;
  const canRequestRevoke = enabledActions.request_revoke;

  const haveInitiatorForm =
    data?.initiator_forms && data.initiator_forms.length > 0;
  const haveRevokeForm =
    !!data?.revoke?.revoke_forms && data.revoke.revoke_forms.length > 0;

  const showRetriggerButton = canRetrigger && !!id && !!data?.can_reinitiate_flow;
  const showRequestRevokeButton = canRequestRevoke && !!id && !!(data?.can_request_revoke || data?.can_revoke);

  const handleStartRevokeConfirm = async () => {
    if (!id) return;
    try {
      const response = await startRevokeMutation.mutateAsync({
        funnel_activity: id,
      });

      const resData = (response as { message?: { session_id?: string } })?.message ?? response;
      const sessionId = resData?.session_id;

      setIsRequestRevokeModalOpen(false);

      if (sessionId) {
        if (
          typeof window !== "undefined" &&
          typeof window.trigger_chatnext_assistant === "function"
        ) {
          window.trigger_chatnext_assistant(true, sessionId);
        } else {
          console.warn("⚠️ trigger_chatnext_assistant is not available on window.");
        }
      }
    } catch (error: unknown) {
      toast.error(errorResponseFormater(error, "Failed to request revoke."));
    }
  };

  const handleShowSelfForm = () => {
    let displayData: JsonToFormData;
    let rawData: JsonToFormData;
    try {
      displayData = JSON.parse(
        data?.initiator_forms?.[0]?.form_data_display || "{}",
      );
      rawData = JSON.parse(
        data?.initiator_forms?.[0]?.form_data || "{}",
      );
    } catch (error) {
      console.error("Invalid initiator_forms JSON:", error);
      return;
    }
    const answer = displayData?.submission_data ?? rawData?.submission_data ?? {};

    if (Object.keys(answer).length === 0 && !rawData?.form?.components && !displayData?.form?.components) return;
    setFormAnswer(answer);
    editedSubmissionDataRef.current = { ...answer };
    setResponseData(answer);
    setIsEditingForm(false);
    setShowSelfForm(true);
  };

  const handleShowRevokeForm = () => {
    if (!data?.revoke?.revoke_forms?.[0]) return;
    const formObj = data.revoke.revoke_forms[0];
    let displayData: JsonToFormData = {};
    let rawData: JsonToFormData = {};
    try {
      displayData = JSON.parse(formObj.form_data_display || "{}");
      rawData = JSON.parse(formObj.form_data || "{}");
    } catch (error) {
      console.error("Invalid revoke_forms JSON:", error);
      return;
    }
    const answer = displayData?.submission_data ?? rawData?.submission_data ?? {};
    const rawSchema = displayData?.form?.components ?? rawData?.form?.components ?? [];
    const schemaToUse = rawSchema.filter(
      (comp) => !(comp.type === "button" && comp.action === "submit")
    );

    setRevokeFormSchema({ display: "form", components: schemaToUse });
    setRevokeFormAnswer(answer);
    setShowRevokeForm(true);
  };

  const handleFormChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (submission: any) => {
      if (submission?.data) {
        editedSubmissionDataRef.current = { ...submission.data };
      }
      if (typeof submission?.isValid === "boolean") {
        setIsFormValid(submission.isValid);
      }
    },
    [],
  );

  const handleSaveForm = () => {
    if (!isFormValid) {
      toast.error("Please fill all required fields correctly.");
      return;
    }

    const conversationDoc = data?.initiator_forms?.[0]?.conversation_doc;
    if (!conversationDoc) {
      toast.error("Unable to save: missing conversation document reference.");
      return;
    }

    updateInitiatorMutation.mutate(
      {
        conversation_doc: conversationDoc,
        submission_data: editedSubmissionDataRef.current,
      },
      {
        onSuccess: () => {
          toast.success("Initiator form updated successfully.");
          setIsEditingForm(false);
          setFormAnswer({ ...editedSubmissionDataRef.current });
          queryClient.invalidateQueries({
            queryKey: ["employee-flow-request-details"],
          });
          queryClient.invalidateQueries({
            queryKey: ["employee-flow-requests"],
          });
        },
        onError: () => {
          toast.error("Failed to update initiator form. Please try again.");
        },
      },
    );
  };

  const queryClient = useQueryClient();
  useEffect(() => {
    const handleChatClose = () => {
      queryClient.invalidateQueries({ queryKey: ["employee-flow-requests"] });
      queryClient.invalidateQueries({
        queryKey: ["employee-flow-request-details"],
      });
    };

    document.addEventListener("chatnext:modal:chat:close", handleChatClose);

    return () => {
      document.removeEventListener(
        "chatnext:modal:chat:close",
        handleChatClose,
      );
    };
  }, [queryClient]);

  useEffect(() => {
    if (!haveInitiatorForm || !data?.initiator_forms) return;

    let displayData: JsonToFormData;
    let rawData: JsonToFormData;
    try {
      displayData = JSON.parse(
        data?.initiator_forms?.[0]?.form_data_display || "{}",
      );
      rawData = JSON.parse(
        data?.initiator_forms?.[0]?.form_data || "{}",
      );
    } catch (e: unknown) {
      console.error("Failed to parse form data", (e as Error)?.message);
      return;
    }

    const rawSchema = isEditingForm
      ? (rawData?.form?.components ?? displayData?.form?.components ?? [])
      : (displayData?.form?.components ?? rawData?.form?.components ?? []);

    // Filter out the native Form.io submit button since we have our own sticky footer
    const schemaToUse = rawSchema.filter(
      (comp) => !(comp.type === "button" && comp.action === "submit")
    );

    const answerToUse = displayData?.submission_data ?? rawData?.submission_data ?? {};

    setFormSchema({ display: "form", components: schemaToUse });

    // Only update the answers from backend if we are not currently editing,
    // to avoid overwriting user input during background refetches.
    if (!isEditingForm) {
      setFormAnswer(answerToUse);
      setResponseData(answerToUse);
      // Also update the ref so if they click edit again, it starts from the latest backend state
      editedSubmissionDataRef.current = { ...answerToUse };
    }
  }, [isEditingForm, data, haveInitiatorForm]);

  const hasWorkflowStages = !!data?.workflow_stages;

  const approvalCounts = useMemo(() => {
    const stages = data?.approval_stages ?? [];
    const completed = stages.filter(
      (s) => s.status === "Approved" || s.status === "Completed",
    ).length;
    const pending = stages.filter((s) => s.status === "Pending").length;
    const rejected = stages.filter((s) => s.status === "Rejected").length;
    return { completed, pending, rejected, total: stages.length };
  }, [data?.approval_stages]);

  const workflowCounts = useMemo(() => {
    const stages = data?.workflow_stages ?? [];
    const completed = stages.filter(
      (s) => s.status === "Approved" || s.status === "Completed",
    ).length;
    const pending = stages.filter((s) => s.status === "Pending").length;
    const rejected = stages.filter((s) => s.status === "Rejected").length;
    return { completed, pending, rejected, total: stages.length };
  }, [data?.workflow_stages]);



  const overallStats = useMemo(() => {
    const total = approvalCounts.total + workflowCounts.total;
    const completed = approvalCounts.completed + workflowCounts.completed;
    const pending = approvalCounts.pending + workflowCounts.pending;
    const rejected = approvalCounts.rejected + workflowCounts.rejected;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, rejected, percentage };
  }, [approvalCounts, workflowCounts]);

  if (isLoading) {
    return (
      <div className="flex flex-col bg-white h-full animate-pulse">
        <div className="bg-white">
          <div className="sm:px-4 flex items-center justify-between p-4 sm:p-2 sm:py-3">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-8 h-8 rounded bg-gray-200 shrink-0" />
              <div className="h-6 w-40 sm:w-64 bg-gray-200 rounded" />
            </div>
            <div className="h-8 w-24 sm:w-32 bg-gray-200 rounded-md" />
          </div>
          <div className="px-4 sm:px-8 flex items-center justify-between mt-2 mb-4 flex-wrap gap-4">
            <div className="flex flex-col w-full gap-3">
              <div className="h-11 w-full bg-gray-200 rounded-lg" />
              <div className="h-11 w-full bg-gray-100 rounded-lg" />
            </div>

            <div className="flex flex-row flex-wrap items-center gap-3 w-full py-1">
              <div className="h-8 w-44 bg-gray-200 rounded-lg border border-gray-100" />
              <div className="h-8 w-36 bg-gray-100 rounded-lg border border-gray-100" />
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-8 flex-1 mt-2 mb-4">
          {isDesktop ? (
            <TableSkeleton columns={4} rows={5} />
          ) : (
            <CardSkeleton rows={4} />
          )}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <NoDataFound subtitle="Flow Request Record not Found" />
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white h-full">
      <div className="bg-white">
        <div className="sm:px-4">
          <HeaderBar
            title={data?.flow_name}
            rightSlot={
              <div className="flex items-center gap-2">
                {isDesktop && haveInitiatorForm && (
                  <Button
                    variant="outline"
                    onClick={handleShowSelfForm}
                    className="flex items-center gap-2 py-1.5 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all rounded-md shadow-sm px-3"
                  >
                    <Eye size={16} className="text-primary-600" />
                    <span>Initiation Form</span>
                  </Button>
                )}
                {isDesktop && showRequestRevokeButton && (
                  <Button
                    variant="outline"
                    bgColor="error"
                    onClick={() => setIsRequestRevokeModalOpen(true)}
                    className="flex items-center gap-2 py-1.5 transition-all rounded-md shadow-sm"
                    disabled={startRevokeMutation.isPending}
                  >
                    Request Revoke
                  </Button>
                )}
                {isDesktop && (
                  <Button
                    variant="outline"
                    onClick={() => setIsActivityLogOpen(true)}
                    className="flex items-center gap-2 py-1.5 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all rounded-md shadow-sm px-3"
                  >
                    <FileText size={16} className="text-gray-500" />
                    <span>Activity Log</span>
                  </Button>
                )}
                {isDesktop && showRetriggerButton && (
                  <RetriggerButton
                    funnelActivityId={id || ""}
                    employeeName={data?.initiated_for}
                  />
                )}
                {!isDesktop && (
                  <div className="flex items-center">
                    <DropdownMenu
                      items={[
                        ...(showRequestRevokeButton
                          ? [
                            {
                              label: "Request Revoke",
                              icon: <XCircle size={16} />,
                              onClick: () => setIsRequestRevokeModalOpen(true),
                              className: "text-red-600 hover:bg-red-50 hover:text-red-700",
                            },
                          ]
                          : []),
                        ...(haveInitiatorForm
                          ? [
                            {
                              label: "Initiation Form",
                              icon: <Eye size={16} className="text-primary-600" />,
                              onClick: handleShowSelfForm,
                            },
                          ]
                          : []),
                        {
                          label: "Activity Log",
                          icon: <FileText size={16} className="text-gray-500" />,
                          onClick: () => setIsActivityLogOpen(true),
                        },
                      ]}
                      placement="bottom-left"
                    >
                      <button className="p-2 border border-gray-300 focus:bg-primary-100/30 focus:ring-primary focus:ring-2 ring-offset-1 text-gray-700 rounded-md flex items-center justify-center hover:bg-primary-50/30 bg-white shadow-sm">
                        <MoreVertical size={20} />
                      </button>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            }
          />
        </div>
        {/* Retrigger button - mobile only (above metadata) */}
        {!isDesktop && showRetriggerButton && (
          <div className="px-4 mt-1 mb-2">
            <RetriggerButton
              funnelActivityId={id || ""}
              employeeName={data?.initiated_for}
              fullWidth
            />
          </div>
        )}
        <div className="px-4 sm:px-8 flex flex-row flex-wrap items-center gap-3 mb-5 mt-1">
          <div className="flex items-center gap-2.5 min-w-0 bg-white border border-gray-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] rounded-lg px-3 py-1.5 transition-all hover:shadow-md hover:border-gray-300/80">
            <span className="font-medium text-gray-500 text-[10px] sm:text-[11px] uppercase tracking-wider whitespace-nowrap">
              Initiated By
            </span>
            <div className="w-px h-3.5 bg-gray-200"></div>
            <span className="text-gray-900 font-semibold text-[13px] sm:text-sm truncate hover:text-primary-600 cursor-pointer transition-colors duration-200">
              <WrapperHoverCard employeeId={data?.initiated_by_employee_id}>
                {data?.initiated_by}{" "}
                {data?.initiated_by_employee_id
                  ? `(${data?.initiated_by_employee_id})`
                  : ""}
              </WrapperHoverCard>
            </span>
          </div>

          <div className="flex items-center gap-2.5 min-w-0 bg-white border border-gray-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] rounded-lg px-3 py-1.5 transition-all hover:shadow-md hover:border-gray-300/80">
            <span className="font-medium text-gray-500 text-[10px] sm:text-[11px] uppercase tracking-wider whitespace-nowrap">
              Initiated On
            </span>
            <div className="w-px h-3.5 bg-gray-200"></div>
            <span className="text-gray-900 font-semibold text-[13px] sm:text-sm whitespace-nowrap">
              {formatToIndianDate(data?.initiated_on)}
            </span>
          </div>

          {data?.effective_date && (
            <div className="flex items-center gap-2.5 min-w-0 bg-white border border-gray-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] rounded-lg px-3 py-1.5 transition-all hover:shadow-md hover:border-gray-300/80">
              <span className="font-medium text-gray-500 text-[10px] sm:text-[11px] uppercase tracking-wider whitespace-nowrap">
                Effective Date
              </span>
              <div className="w-px h-3.5 bg-gray-200"></div>
              <span className="text-gray-900 font-semibold text-[13px] sm:text-sm whitespace-nowrap">
                {formatToIndianDate(data.effective_date)}
              </span>
            </div>
          )}

        </div>
      </div>
      <ActivityLogDrawer
        open={isActivityLogOpen}
        onClose={() => setIsActivityLogOpen(false)}
        funnelActivityId={id || ""}
        title="Activity Log"
        size="xxl"
      />
      <div className="overflow-y-auto flex-1">
        <div className="flex flex-col gap-3 px-4 sm:px-7 py-4 pb-8">
          {/* Overall Stats Card */}
          <div className="rounded-xl border border-gray-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] px-5 sm:px-6 py-4">
            <div className="flex items-center gap-4 sm:gap-5">
              {/* Circular Progress Ring */}
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0">
                {(() => {
                  const r = 20;
                  const circumference = 2 * Math.PI * r;
                  const offset = circumference * (1 - overallStats.percentage / 100);
                  const strokeColor = overallStats.percentage === 100 ? "#22c55e" : "#6172F3";
                  return (
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
                      <circle
                        cx="24" cy="24" r={r}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="4"
                      />
                      <circle
                        cx="24" cy="24" r={r}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{ transition: "stroke-dashoffset 0.7s ease-out" }}
                      />
                    </svg>
                  );
                })()}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[11px] sm:text-xs font-bold text-gray-700">
                    {overallStats.percentage}%
                  </span>
                </div>
              </div>

              {/* Stats Text */}
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-sm sm:text-[15px] font-semibold text-gray-800">
                  {overallStats.completed}/{overallStats.total} Tasks Completed
                </span>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {overallStats.pending > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      {overallStats.pending} Pending
                    </span>
                  )}
                  {overallStats.rejected > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-600">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {overallStats.rejected} Rejected
                    </span>
                  )}
                  {overallStats.pending === 0 && overallStats.rejected === 0 && overallStats.completed === overallStats.total && overallStats.total > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-green-600">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      All tasks done
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Approval Flow Status - Accordion */}
          <div className="rounded-xl border border-gray-200/80 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] bg-white">
            <button
              onClick={() => setApprovalExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 bg-gradient-to-r from-primary-50/60 to-white hover:from-primary-50 hover:to-primary-50/30 transition-all duration-200 group border-l-[3px] border-l-primary-500"
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[13px] sm:text-[15px] font-semibold text-gray-800">
                  Approval Flow Status
                </span>
                <div className="flex items-center gap-2">
                  {approvalCounts.completed > 0 && (
                    <span className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200/60 px-2.5 py-0.5 rounded-xl inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      {approvalCounts.completed} completed
                    </span>
                  )}
                  {approvalCounts.pending > 0 && (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-0.5 rounded-xl inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {approvalCounts.pending} pending
                    </span>
                  )}
                  {approvalCounts.rejected > 0 && (
                    <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200/60 px-2.5 py-0.5 rounded-xl inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {approvalCounts.rejected} rejected
                    </span>
                  )}
                  {approvalCounts.completed === 0 && approvalCounts.pending === 0 && approvalCounts.rejected === 0 && (
                    <span className="text-[11px] font-medium text-gray-500 bg-gray-100 border border-gray-200/60 px-2.5 py-0.5 rounded-xl">
                      {data.approval_stages?.length ?? 0} stages
                    </span>
                  )}
                </div>
              </div>
              <div className="w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-primary-100 flex items-center justify-center transition-colors duration-200 shrink-0 ml-3">
                <ChevronDown
                  size={16}
                  className={`text-gray-500 group-hover:text-primary-600 transition-all duration-300 ${approvalExpanded ? "rotate-180" : "rotate-0"
                    }`}
                />
              </div>
            </button>
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${approvalExpanded
                ? "opacity-100"
                : "max-h-0 opacity-0"
                }`}
            >
              <div className="border-t border-gray-100">
                <FlowTable data={data} noPadding={true} />
              </div>
            </div>
          </div>

          {/* Workflow Status - Accordion (only if workflow stages exist) */}
          {hasWorkflowStages && (
            <div className="rounded-xl border border-gray-200/80 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] bg-white">
              <button
                onClick={() => setWorkflowExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 bg-gradient-to-r from-amber-50/60 to-white hover:from-amber-50 hover:to-amber-50/30 transition-all duration-200 group border-l-[3px] border-l-amber-500"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[13px] sm:text-[15px] font-semibold text-gray-800">
                    Workflow Status
                  </span>
                  <div className="flex items-center gap-2">
                    {workflowCounts.completed > 0 && (
                      <span className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200/60 px-2.5 py-0.5 rounded-xl inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        {workflowCounts.completed} completed
                      </span>
                    )}
                    {workflowCounts.pending > 0 && (
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-0.5 rounded-xl inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {workflowCounts.pending} pending
                      </span>
                    )}
                    {workflowCounts.rejected > 0 && (
                      <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200/60 px-2.5 py-0.5 rounded-xl inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {workflowCounts.rejected} rejected
                      </span>
                    )}
                    {workflowCounts.completed === 0 && workflowCounts.pending === 0 && workflowCounts.rejected === 0 && (
                      <span className="text-[11px] font-medium text-gray-500 bg-gray-100 border border-gray-200/60 px-2.5 py-0.5 rounded-xl">
                        {data.workflow_stages?.length ?? 0} stages
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-amber-100 flex items-center justify-center transition-colors duration-200 shrink-0 ml-3">
                  <ChevronDown
                    size={16}
                    className={`text-gray-500 group-hover:text-amber-600 transition-all duration-300 ${workflowExpanded ? "rotate-180" : "rotate-0"
                      }`}
                  />
                </div>
              </button>
              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${workflowExpanded
                  ? "opacity-100"
                  : "max-h-0 opacity-0"
                  }`}
              >
                <div className="border-t border-gray-200">
                  <WorkflowTable data={data} noPadding={true} />
                </div>
              </div>
            </div>
          )}

          {/* Dedicated Revocation Details & Approval Section (below workflow status card) */}
          {data?.revoke && (
            <RevokeDetailsSection
              revoke={data.revoke}
              haveRevokeForm={haveRevokeForm}
              onViewRevokeForm={handleShowRevokeForm}
            />
          )}
        </div>
      </div>
      {formSchema &&
        showSelfForm &&
        createPortal(
          <ReviewForm
            onClose={() => {
              setShowSelfForm(false);
              setIsEditingForm(false);
            }}
            showReqFormio={isEditingForm}
            title={isEditingForm ? "Edit Initiation Form" : "Initiation Form"}
            headerAction={
              !!data?.can_edit_initiator_form && <Button
                variant={isEditingForm ? "soft" : "outline"}
                size="sm"
                onClick={() => setIsEditingForm((prev) => !prev)}
                className={`flex items-center gap-1.5 py-1 px-2.5 transition-all rounded-md ${isEditingForm
                  ? "border-primary-300 text-primary-700 bg-primary-50"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
              >
                <Pencil size={13} className={isEditingForm ? "text-primary-600" : "text-gray-500"} />
                <span className="text-xs font-medium">{isEditingForm ? "Editing" : "Edit"}</span>
              </Button>
            }
            footerAction={
              isEditingForm ? (
                <div className="flex items-center justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditingForm(false)}
                    className="px-4 py-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contain"
                    onClick={handleSaveForm}
                    loading={updateInitiatorMutation.isPending}
                    disabled={updateInitiatorMutation.isPending}
                    className="px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <Save size={15} />
                    Save Changes
                  </Button>
                </div>
              ) : undefined
            }
          >
            <FormPreview
              containerId="initiation-form-preview"
              schema={formSchema}
              submissionData={formAnswer}
              readOnly={!isEditingForm}
              onChange={(s) => { if (isEditingForm) handleFormChange(s); }}
            />
            {!isEditingForm && (
              <AttachmentPreview
                attachments={responseData?.addAttachment || []}
              />
            )}
          </ReviewForm>,
          document.body,
        )}
      {revokeFormSchema &&
        showRevokeForm &&
        createPortal(
          <ReviewForm
            onClose={() => setShowRevokeForm(false)}
            showReqFormio={false}
            title="Revoke Form"
          >
            <FormPreview
              containerId="revoke-form-preview"
              schema={revokeFormSchema}
              submissionData={revokeFormAnswer}
              readOnly={true}
            />
          </ReviewForm>,
          document.body,
        )}
      <ActionConfirmationModal
        isOpen={isRequestRevokeModalOpen}
        title="Request Revoke"
        message="Are you sure you want to request revocation for this flow request?"
        confirmLabel="Yes, Request Revoke"
        cancelLabel="Cancel"
        confirmBgColor="error"
        isPending={startRevokeMutation.isPending}
        onConfirm={handleStartRevokeConfirm}
        onCancel={() => setIsRequestRevokeModalOpen(false)}
      />
    </div>
  );
};

export default RequestDetails;

