import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Eye, RefreshCw, UserCheck } from "lucide-react";

import Tooltip from "../../../shared/Tooltip";
import { Typography } from "../../../shared/atoms/Typography";
import ReviewForm from "../../Separation/components/ReviewForm";
import FormPreview from "../../../shared/molecules/FormPreview";
import AttachmentPreview from "./AttachmentPreview";
import RetriggerModal from "./RetriggerModal";

import { Attachment, WorkflowStage } from "../../../../types/flows";
import { handleActionType } from "../../../../hooks/userApprovalList";
import { FormIOForm } from "../../../../utils/flowUtils";

interface WorkflowStageActionsProps {
  stage: WorkflowStage;
  handleAction: handleActionType;
  variant?: "pill" | "buttons";
  canAct: boolean;
  idx?: number;
}

const WorkflowStageActions = ({
  stage,
  handleAction,
  variant = "pill",
  canAct,
  idx = 0,
}: WorkflowStageActionsProps) => {
  const hasReviewForm = !!(stage?.form_data && stage.status !== "Pending");

  const [showRetriggerModal, setShowRetriggerModal] = useState(false);

  // Review form state
  const [showForm, setShowForm] = useState(false);
  const [formSchema, setFormSchema] = useState<FormIOForm | null>(null);
  const [responseData, setResponseData] = useState<{
    addAttachment?: Attachment[];
  } | null>(null);
  const [formAnswer, setFormAnswer] = useState<Record<string, unknown>>({});

  const handleShowForm = () => {
    let formData: Record<string, unknown> = {};
    try {
      formData = JSON.parse(
        stage?.form_data_display || stage?.form_data ||
        "{}",
      );
    } catch (error) {
      console.error("Invalid form_data JSON:", error);
      return;
    }
    const schema = (formData as any)?.form?.components;
    if (!schema) return;
    const data = (formData as any)?.submission_data ?? {};
    setFormSchema({ display: "form", components: schema });
    setFormAnswer(data);
    setResponseData(data);
    setShowForm(true);
  };

  const actions = useMemo(() => {
    try {
      return stage?.todo?.custom_doctype_actions
        ? JSON.parse(stage.todo.custom_doctype_actions)
        : [];
    } catch (e) {
      console.error("Failed to parse custom_doctype_actions", e);
      return [];
    }
  }, [stage?.todo?.custom_doctype_actions]);

  const actionsWithForm = useMemo(() => {
    try {
      return stage?.todo?.custom_doctype_actions_with_form
        ? JSON.parse(
          stage.todo.custom_doctype_actions_with_form.replace(/'/g, '"'),
        )
        : [];
    } catch (e) {
      console.error("Failed to parse custom_doctype_actions_with_form", e);
      return [];
    }
  }, [stage?.todo?.custom_doctype_actions_with_form]);

  const onAction = (action: string, data: any) => {
    if (!data?.name) {
      console.error("Action failed: Missing todo name.");
      return;
    }
    handleAction(
      action,
      {
        todo_id: data.name,
        custom_approval_type: data.custom_approval_type,
        custom_open_chatnext_assistant_on_action:
          !actionsWithForm.includes(action),
      },
      "Action Performed Successfully",
    );
  };

  const showAct = !!(canAct && actions.length > 0);
  const showRetrigger = !!stage.can_retrigger;
  const showReviewForm = !!hasReviewForm;

  if (!showAct && !showRetrigger && !showReviewForm) {
    return null;
  }

  const actionItems = [];

  if (showReviewForm) {
    actionItems.push({
      key: "review_form",
      label: "Review Form",
      tooltip: "Review Form",
      onClick: handleShowForm,
      iconPill: <Eye className="w-4 h-4 text-slate-600 hover:text-slate-800 transition-colors" />,
      iconButton: <Eye className="w-4 h-4 text-white" />,
    });
  }

  if (showRetrigger) {
    actionItems.push({
      key: "retrigger",
      label: "Retrigger",
      tooltip: "Retrigger",
      onClick: () => setShowRetriggerModal(true),
      iconPill: <RefreshCw className="w-4 h-4 text-amber-600 hover:text-amber-700 transition-colors" />,
      iconButton: <RefreshCw className="w-4 h-4 text-white" />,
    });
  }

  if (showAct) {
    actionItems.push({
      key: "act",
      label: "Act",
      tooltip: "Act",
      onClick: () => onAction(actions[0], stage?.todo),
      iconPill: <UserCheck className="w-4 h-4 text-primary-600 hover:text-primary-700 transition-colors" />,
      iconButton: <UserCheck className="w-4 h-4 text-white" />,
    });
  }

  if (variant === "pill") {
    return (
      <>
        <div className="h-8 flex items-center gap-1.5 px-3 py-1 rounded-3xl bg-gray-10 border border-gray-200 w-fit">
          {actionItems.map((action, idx) => (
            <div key={action.key} className="flex items-center gap-1.5">
              <Tooltip content={action.tooltip} position="top">
                <button
                  aria-label={action.label}
                  title={action.tooltip}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    action.onClick();
                  }}
                  className="flex items-center justify-center"
                >
                  {action.iconPill}
                </button>
              </Tooltip>

              {idx < actionItems.length - 1 && (
                <span className="w-px h-4 bg-gray-300" />
              )}
            </div>
          ))}
        </div>

        {formSchema && showForm && createPortal(
          <ReviewForm onClose={() => setShowForm(false)}>
            <FormPreview
              containerId={`workflow-stage-${idx}-form-preview`}
              schema={formSchema}
              submissionData={formAnswer}
              readOnly={true}
            />
            <AttachmentPreview
              attachments={responseData?.addAttachment || []}
            />
          </ReviewForm>,
          document.body
        )}
        <RetriggerModal
          isOpen={showRetriggerModal}
          onClose={() => setShowRetriggerModal(false)}
          stage={stage}
        />
      </>
    );
  }

  const getColSpanClass = (index: number, total: number) => {
    if (total === 3 && index === 2) {
      return "col-span-2";
    }
    if (total === 1) {
      return "col-span-2";
    }
    return "col-span-1";
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2 mt-3 w-full">
        {actionItems.map((action, idx) => (
          <button
            key={action.key}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              action.onClick();
            }}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors bg-primary hover:bg-primary/95 text-white border border-transparent ${getColSpanClass(idx, actionItems.length)}`}
          >
            {action.iconButton}
            <Typography variant="bodySmall" color="white" className="font-semibold">
              {action.label}
            </Typography>
          </button>
        ))}
      </div>

      {formSchema && showForm && createPortal(
        <ReviewForm onClose={() => setShowForm(false)}>
          <FormPreview
            containerId={`workflow-stage-${idx}-form-preview`}
            schema={formSchema}
            submissionData={formAnswer}
            readOnly={true}
          />
          <AttachmentPreview
            attachments={responseData?.addAttachment || []}
          />
        </ReviewForm>,
        document.body
      )}
      <RetriggerModal
        isOpen={showRetriggerModal}
        onClose={() => setShowRetriggerModal(false)}
        stage={stage}
      />
    </>
  );
};

export default WorkflowStageActions;
