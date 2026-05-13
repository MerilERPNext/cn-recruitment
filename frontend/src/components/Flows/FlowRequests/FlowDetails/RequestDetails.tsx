import { useEffect, useState } from "react";
import HeaderBar from "../../../HeaderBar";
import { Attachment } from "../../../../types/flows";

import formatToIndianDate from "../../../../utils/formatToIndianDate";
import FlowTable from "./FlowTable";
import WorkflowTable from "./WorkflowTable";
import Button from "../../../shared/atoms/Button";
import { FormIOForm } from "../../../../utils/flowUtils";
import { createPortal } from "react-dom";
import ReviewForm from "../../Separation/components/ReviewForm";
import { Eye } from "lucide-react";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import AttachmentPreview from "./AttachmentPreview";
import { useGetFlowRequestById } from "../../../../hooks/useFlows";
import { useNavigate, useParams } from "react-router-dom";
import TableSkeleton, { CardSkeleton } from "../../../shared/molecules/Skeletons/TableSkeleton";
import NoDataFound from "../../../shared/atoms/NoDataFound";
import FormPreview from "../../../shared/molecules/FormPreview";
import { FormIOComponent } from "../../../../types/formio";

import WrapperHoverCard from "../../../shared/WrapperHoverCard";
import { useQueryClient } from "@tanstack/react-query";

type FlowStatusType = "Approval Flow Status" | "Workflow Status";
type JsonToFormData = { form?: { components?: FormIOComponent[] }, submission_data?: Record<string, unknown> };


const RequestDetails: React.FC = () => {
  const { id } = useParams();
  const { data: flowResponse, isLoading } = useGetFlowRequestById(id || "");
  const data = flowResponse?.data;
  const { isDesktop } = useScreenSize();
  const [flowStatusType, setFlowStatusType] = useState<FlowStatusType>(
    "Approval Flow Status",
  );
  const [showSelfForm, setShowSelfForm] = useState(false);
  const [responseData, setResponseData] = useState<{ addAttachment?: Attachment[] } | null>(null);
  const [formSchema, setFormSchema] = useState<FormIOForm | null>(null);
  const [formAnswer, setFormAnswer] = useState<Record<string, unknown>>({});

  const haveInitiatorForm = data?.initiator_forms && data.initiator_forms.length > 0;

  const handleShowSelfForm = () => {
    let formData: JsonToFormData;
    try {
      formData = JSON.parse(data?.initiator_forms?.[0]?.form_data_display || "{}");
    } catch (error) {
      console.error("Invalid initiator_forms form_data_display JSON:", error);
      return;
    }
    const schema = formData?.form?.components ?? [];
    const answer = (formData)?.submission_data ?? {};

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
      queryClient.invalidateQueries({ queryKey: ["employee-flow-request-details"] });
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
  }

  const tabs = [
    { label: "Approval Flow Status", value: "Approval Flow Status" },
    ...(data?.workflow_stages && data.workflow_stages.length > 0
      ? [{ label: "Workflow Status", value: "Workflow Status" }]
      : []),
  ];

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
            <div className="flex w-full sm:w-fit border border-gray-200 rounded-sm overflow-hidden shadow-sm">
              <div className="flex-1 sm:flex-none sm:w-44 h-10 bg-gray-200 border-r border-gray-200" />
              <div className="flex-1 sm:flex-none sm:w-44 h-10 bg-gray-100" />
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
        <Button variant="outline" onClick={handleNavigateBack}>Go Back</Button>
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
              haveInitiatorForm ?
                <Button
                  variant="outline"
                  onClick={handleShowSelfForm}
                  className={`flex items-center gap-2 py-1.5 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all rounded-md shadow-sm ${isDesktop ? 'px-3' : 'px-2'}`}
                >
                  <Eye size={16} className="text-primary-600" />
                  {isDesktop && <span>Initiation Form</span>}
                </Button> : null
            }
          />
        </div>
        <div className="px-8 flex items-center justify-between mb-4 flex-wrap gap-4">
          <div className="flex w-full sm:w-fit border border-gray-200 rounded-sm overflow-hidden shadow-sm">
            {tabs.map((btn, index) => {
              const isActive = flowStatusType === btn.value;
              return (
                <button
                  key={btn.value}
                  onClick={() => setFlowStatusType(btn.value as FlowStatusType)}
                  disabled={isActive}
                  className={`flex-1 sm:flex-none px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 
          ${isActive
                      ? "bg-primary-600 text-white font-semibold shadow-inner"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
                    }
          ${index === 0 ? "rounded-l-sm" : "rounded-r-sm"}`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-row sm:items-center justify-between sm:justify-end w-full sm:w-auto gap-4 sm:gap-6 text-sm py-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 min-w-0">
              <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px] whitespace-nowrap">Initiated By</span>
              <span className="text-gray-900 font-medium bg-gray-50 px-2 py-0.5 rounded border border-gray-100 truncate max-w-[140px] sm:max-w-none hover:text-primary cursor-pointer transition-colors duration-200">
                <WrapperHoverCard employeeId={data?.initiated_by_employee_id}>
                  {data?.initiated_by} {data?.initiated_by_employee_id ? `(${data?.initiated_by_employee_id})` : ""}
                </WrapperHoverCard>
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 min-w-0">
              <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px] whitespace-nowrap">Initiated On</span>
              <span className="text-gray-900 font-medium bg-gray-50 px-2 py-0.5 rounded border border-gray-100 whitespace-nowrap">
                {formatToIndianDate(data?.initiated_on)}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-y-auto flex-1">
        {flowStatusType === "Approval Flow Status" ? (
          <FlowTable data={data} />
        ) : (
          <WorkflowTable data={data} />
        )}
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
              readOnly={true}
            />
            <AttachmentPreview attachments={responseData?.addAttachment || []} />
          </ReviewForm>,
          document.body,
        )}
    </div>
  );
};

export default RequestDetails;
