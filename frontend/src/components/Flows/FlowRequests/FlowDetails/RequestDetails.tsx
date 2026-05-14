import { useEffect, useMemo, useState } from "react";
import { Attachment } from "../../../../types/flows";
import HeaderBar from "../../../HeaderBar";

import { ChevronDown, Eye } from "lucide-react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { useGetFlowRequestById } from "../../../../hooks/useFlows";
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

import { useQueryClient } from "@tanstack/react-query";
import WrapperHoverCard from "../../../shared/WrapperHoverCard";

type JsonToFormData = {
  form?: { components?: FormIOComponent[] };
  submission_data?: Record<string, unknown>;
};

const RequestDetails: React.FC = () => {
  const { id } = useParams();
  const { data: flowResponse, isLoading } = useGetFlowRequestById(id || "");
  const data = flowResponse?.data;
  const { isDesktop } = useScreenSize();
  const [approvalExpanded, setApprovalExpanded] = useState(false);
  const [workflowExpanded, setWorkflowExpanded] = useState(false);
  const [showSelfForm, setShowSelfForm] = useState(false);
  const [responseData, setResponseData] = useState<{
    addAttachment?: Attachment[];
  } | null>(null);
  const [formSchema, setFormSchema] = useState<FormIOForm | null>(null);
  const [formAnswer, setFormAnswer] = useState<Record<string, unknown>>({});

  const haveInitiatorForm =
    data?.initiator_forms && data.initiator_forms.length > 0;

  const handleShowSelfForm = () => {
    let formData: JsonToFormData;
    try {
      formData = JSON.parse(
        data?.initiator_forms?.[0]?.form_data_display || "{}",
      );
    } catch (error) {
      console.error("Invalid initiator_forms form_data_display JSON:", error);
      return;
    }
    const schema = formData?.form?.components ?? [];
    const answer = formData?.submission_data ?? {};

    if (!schema) return;
    setFormSchema({ display: "form", components: schema });
    setFormAnswer(answer);
    setResponseData(answer);
    setShowSelfForm(true);
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

  const navigate = useNavigate();
  const handleNavigateBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/webapp/flow-app/flow-requests");
    }
  };

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

            <div className="flex flex-row sm:items-center justify-between w-full sm:w-auto gap-4 sm:gap-6 text-sm py-1">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 min-w-0">
                <div className="h-3 w-16 sm:w-20 bg-gray-200 rounded" />
                <div className="h-5 sm:h-6 w-24 sm:w-32 bg-gray-100 rounded border border-gray-100" />
              </div>
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 min-w-0">
                <div className="h-3 w-16 sm:w-20 bg-gray-200 rounded" />
                <div className="h-5 sm:h-6 w-24 sm:w-28 bg-gray-100 rounded border border-gray-100" />
              </div>
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
        <Button variant="outline" onClick={handleNavigateBack}>
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
            onBack={handleNavigateBack}
            rightSlot={
              haveInitiatorForm ? (
                <Button
                  variant="outline"
                  onClick={handleShowSelfForm}
                  className={`flex items-center gap-2 py-1.5 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all rounded-md shadow-sm ${isDesktop ? "px-3" : "px-2"}`}
                >
                  <Eye size={16} className="text-primary-600" />
                  {isDesktop && <span>Initiation Form</span>}
                </Button>
              ) : null
            }
          />
        </div>
        <div className="px-8 flex items-center justify-end mb-4 flex-wrap gap-4">
          <div className="flex flex-row sm:items-center justify-between sm:justify-end w-full sm:w-auto gap-4 sm:gap-6 text-sm py-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 min-w-0">
              <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px] whitespace-nowrap">
                Initiated By
              </span>
              <span className="text-gray-900 font-medium bg-gray-50 px-2 py-0.5 rounded border border-gray-100 truncate max-w-[140px] sm:max-w-none hover:text-primary cursor-pointer transition-colors duration-200">
                <WrapperHoverCard employeeId={data?.initiated_by_employee_id}>
                  {data?.initiated_by}{" "}
                  {data?.initiated_by_employee_id
                    ? `(${data?.initiated_by_employee_id})`
                    : ""}
                </WrapperHoverCard>
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 min-w-0">
              <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px] whitespace-nowrap">
                Initiated On
              </span>
              <span className="text-gray-900 font-medium bg-gray-50 px-2 py-0.5 rounded border border-gray-100 whitespace-nowrap">
                {formatToIndianDate(data?.initiated_on)}
              </span>
            </div>
          </div>
        </div>
      </div>
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
                ? "max-h-[2000px] opacity-100"
                : "max-h-0 opacity-0"
                }`}
            >
              <div className="border-t border-gray-100">
                <FlowTable data={data} />
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
                  ? "max-h-[2000px] opacity-100"
                  : "max-h-0 opacity-0"
                  }`}
              >
                <div className="border-t border-gray-200">
                  <WorkflowTable data={data} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {formSchema &&
        showSelfForm &&
        createPortal(
          <ReviewForm
            onClose={() => setShowSelfForm(false)}
            title="Initiation Form"
          >
            <FormPreview
              containerId="initiation-form-preview"
              schema={formSchema}
              submissionData={formAnswer}
              readOnly={false}
            />
            <AttachmentPreview
              attachments={responseData?.addAttachment || []}
            />
          </ReviewForm>,
          document.body,
        )}
    </div>
  );
};

export default RequestDetails;

