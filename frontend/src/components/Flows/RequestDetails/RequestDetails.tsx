import { useState } from "react";
import HeaderBar from "../../HeaderBar";
import { Attachment, FlowRequestItem } from "../../../types/flows";

import formatToIndianDate from "../../../utils/formatToIndianDate";
import FlowTable from "./FlowTable";
import WorkflowTable from "./WorkflowTable";
import Button from "../../shared/atoms/Button";
import { buildFormFromSchemaAndAnswer, FormIOForm } from "../../../utils/flowUtils";
import { createPortal } from "react-dom";
import ReviewForm from "../Separation/components/ReviewForm";
import { Form } from "@tsed/react-formio";
import { Eye } from "lucide-react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import AttachmentPreview from "./AttachmentPreview";

type FlowStatusType = "Approval Flow Status" | "Workflow Status";

interface RequestDetailsProps {
  data: FlowRequestItem,
  handleNavigateBack: () => void
}
const RequestDetails: React.FC<RequestDetailsProps> = ({ data, handleNavigateBack }) => {
  const { isDesktop } = useScreenSize();
  const [flowStatusType, setFlowStatusType] = useState<FlowStatusType>(
    "Approval Flow Status",
  );
  const [showSelfForm, setShowSelfForm] = useState(false);
  const [formSchema, setFormSchema] = useState<FormIOForm | null>(null);
  const [responseData, setResponseData] = useState<{ addAttachment?: Attachment[] } | null>(null);

  const haveInitiatorForm = data?.initiator_forms && data.initiator_forms.length > 0;

  const handleShowSelfForm = () => {
    let formData: Record<string, any> = {};
    try {
      formData = JSON.parse(data?.initiator_forms?.[0]?.form_data);
    } catch (error) {
      console.error("Invalid initiator_forms form_data JSON:", error);
      return;
    }
    const schema = (formData as any)?.form?.components;
    const answer = (formData as any)?.submission_data;

    if (!schema) return;
    setFormSchema(buildFormFromSchemaAndAnswer(schema, answer));
    setResponseData(answer);
    setShowSelfForm(true);
  }



  const tabs = [
    { label: "Approval Flow Status", value: "Approval Flow Status" },
    ...(data?.workflow_stages && data.workflow_stages.length > 0
      ? [{ label: "Workflow Status", value: "Workflow Status" }]
      : []),
  ];

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="bg-white">
        <div className="sm:px-4">
          <HeaderBar
            title={data.flow_name}
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

          <div className="flex flex-row sm:items-center justify-between max-lg:w-full gap-2 sm:gap-6 text-sm py-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Initiated By</span>
              <span className="text-gray-900 font-medium bg-gray-50 px-2 py-0.5 rounded border border-gray-100 italic"> {data.initiated_by} </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Initiated On</span>
              <span className="text-gray-900 font-medium bg-gray-50 px-2 py-0.5 rounded border border-gray-100"> {formatToIndianDate(data.initiated_on)} </span>
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
            <Form
              form={formSchema}
              options={{
                readOnly: true, // This makes the entire form read-only
                viewAsHtml: false, // Set to true to render as plain HTML instead of form inputs
              }}
              submit={false}
            />
            <AttachmentPreview attachments={responseData?.addAttachment || []} />
          </ReviewForm>,
          document.body,
        )}
    </div>
  );
};

export default RequestDetails;
