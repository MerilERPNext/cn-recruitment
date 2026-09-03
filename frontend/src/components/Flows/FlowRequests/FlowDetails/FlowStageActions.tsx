import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Eye, RotateCw, UserCheck, X, BellRing } from "lucide-react";
import toast from "react-hot-toast";

import { useRetriggerApprovalFlowEvent } from "../../../../hooks/useFlows";
import { useNudge } from "../../../../hooks/useNudge";
import { useGetUiPermission } from "../../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../../utils/uiPermission";
import { errorResponseFormater } from "../../../../utils/errorResponseFormater";

import Tooltip from "../../../shared/Tooltip";
import Button from "../../../shared/atoms/Button";
import { Typography } from "../../../shared/atoms/Typography";
import Modal from "../../../shared/Modal";
import ReviewForm from "../../Separation/components/ReviewForm";
import FormPreview from "../../../shared/molecules/FormPreview";
import AttachmentPreview from "./AttachmentPreview";
import ActModal from "./ActModal";

import { Attachment, FlowRequestItem, FlowRequestStage } from "../../../../types/flows";
import { handleActionType } from "../../../../hooks/userApprovalList";
import { FormIOForm } from "../../../../utils/flowUtils";

interface FlowStageActionsProps {
  stage: FlowRequestStage;
  stages: FlowRequestStage[];
  stageIndex: number;
  initiatorForms?: FlowRequestItem["initiator_forms"];
  handleAction: handleActionType;
  variant?: "pill" | "buttons";
  canAct: boolean;
  page?: "Flow Requests" | "Separation" | "Confirmation";
}

const FlowStageActions = ({
  stage,
  stages,
  stageIndex,
  initiatorForms,
  handleAction,
  variant = "pill",
  canAct,
  page = "Flow Requests",
}: FlowStageActionsProps) => {
  const { data: userUiPermission } = useGetUiPermission("HR Process");

  const actionKeyMap: Record<string, string> = {
    "Flow Requests": "flow_stage_retrigger",
    "Separation": "separation_stage_retrigger",
    "Confirmation": "confirmation_stage_retrigger",
  };

  const actionKey = actionKeyMap[page] || "";
  const isRetriggerAllowed = stage?.todo?.name && actionKey
    ? isActionEnabled(userUiPermission, actionKey, page)
    : false;

  const isPendingStatus = ["pending", "open"].includes(stage?.status?.toLowerCase());
  const isNudgeAllowed = stage?.todo?.name && isPendingStatus
    ? isActionEnabled(userUiPermission, "nudge", page)
    : false;

  const hasReviewForm = !!(stage?.approval_response_data_display || stage?.approval_response_data);

  const { mutate: retrigger, isPending: isPendingRetrigger } = useRetriggerApprovalFlowEvent();
  const { mutate: sendNudge, isPending: nudging } = useNudge();

  const [showActModal, setShowActModal] = useState(false);
  const [showRetriggerConfirm, setShowRetriggerConfirm] = useState(false);

  // Review form state
  const [showForm, setShowForm] = useState(false);
  const [formSchema, setFormSchema] = useState<FormIOForm | null>(null);
  const [responseData, setResponseData] = useState<{
    addAttachment?: Attachment[];
  } | null>(null);
  const [formAnswer, setFormAnswer] = useState<Record<string, unknown>>({});

  const handleShowForm = () => {
    if (!stage?.form_json?.components) return;

    const schema = stage.form_json.components;

    let data: Record<string, unknown> = {};

    try {
      data = stage?.form_data_display || JSON.parse(
        stage?.approval_response_data ||
        "{}",
      );
    } catch (error) {
      console.error("Invalid approval_response_data JSON:", error);
      data = {};
    }
    setFormSchema({ display: "form", components: schema });
    setFormAnswer(data);
    setResponseData(data);
    setShowForm(true);
  };

  const actionsList = useMemo(() => {
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

  const onAction = (action: string, data: FlowRequestStage["todo"]) => {
    if (!data?.name) {
      console.error("Action failed: Missing todo name.");
      return;
    }
    handleAction(action, {
      todo_id: data.name,
      custom_approval_type: data?.custom_approval_type ?? "Approval Matrix",
      custom_open_chatnext_assistant_on_action:
        actionsWithForm.includes(action),
    });
    setShowActModal(false);
  };

  const showAct = !!canAct;
  const showRetrigger = !!isRetriggerAllowed;
  const showReviewForm = !!hasReviewForm;
  const showNudge = !!isNudgeAllowed;

  if (!showAct && !showRetrigger && !showReviewForm && !showNudge) {
    return null;
  }

  const actionItems = [];

  if (showReviewForm) {
    actionItems.push({
      key: "review_form",
      label: "Review Form",
      tooltip: "Review Form",
      onClick: handleShowForm,
      iconPill: <Eye className="w-4 h-4 text-text-body2 hover:text-text-title transition-colors" />,
      iconButton: <Eye className="w-4 h-4 text-white" />,
    });
  }

  if (showNudge) {
    actionItems.push({
      key: "nudge",
      label: "Nudge",
      tooltip: "Nudge",
      loading: nudging,
      onClick: () => sendNudge(stage.todo.name),
      iconPill: <BellRing className="w-4 h-4 text-primary hover:text-primary transition-colors" />,
      iconButton: <BellRing className="w-4 h-4 text-white" />,
    });
  }

  if (showRetrigger) {
    actionItems.push({
      key: "retrigger",
      label: "Retrigger",
      tooltip: "Retrigger",
      loading: isPendingRetrigger,
      onClick: () => setShowRetriggerConfirm(true),
      iconPill: <RotateCw className="w-4 h-4 text-amber-600 hover:text-amber-700 transition-colors" />,
      iconButton: <RotateCw className="w-4 h-4 text-white" />,
    });
  }

  if (showAct) {
    actionItems.push({
      key: "act",
      label: "Act",
      tooltip: "Act",
      onClick: () => setShowActModal(true),
      iconPill: <UserCheck className="w-4 h-4 text-primary-600 hover:text-primary-700 transition-colors" />,
      iconButton: <UserCheck className="w-4 h-4 text-white" />,
    });
  }

  const retriggerConfirmModal = showRetriggerConfirm && stage?.todo?.name ? createPortal(
    <Modal isOpen={showRetriggerConfirm} onClose={() => setShowRetriggerConfirm(false)} size="sm">
      <div className="p-6 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <Typography variant="subheading">
            Confirm Retrigger Action?
          </Typography>
          <button
            onClick={() => setShowRetriggerConfirm(false)}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <Typography variant="bodySmall" className="text-gray-600 leading-relaxed">
          Are you sure you want to retrigger this stage? The task will be retriggered to the respective assignees.
        </Typography>

        <div className="flex gap-3 justify-end pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRetriggerConfirm(false)}
            disabled={isPendingRetrigger}
          >
            Cancel
          </Button>
          <Button
            variant="contain"
            size="sm"
            onClick={() => {
              retrigger({ todo: stage.todo.name }, {
                onSuccess: () => {
                  toast.success("Stage retriggered successfully");
                  setShowRetriggerConfirm(false);
                },
                onError: (error) => {
                  const formattedError = errorResponseFormater(error, "Failed to retrigger stage.");
                  toast.error(formattedError);
                  setShowRetriggerConfirm(false);
                }
              });
            }}
            loading={isPendingRetrigger}
            disabled={isPendingRetrigger}
          >
            Retrigger
          </Button>
        </div>
      </div>
    </Modal>,
    document.body
  ) : null;

  if (variant === "pill") {
    return (
      <>
        <div className="h-8 flex items-center gap-1.5 px-3 py-1 rounded-3xl bg-gray-10 border border-gray-200 w-fit">
          {actionItems.map((action, idx) => (
            <div key={action.key} className="flex items-center gap-1.5">
              <Tooltip content={action.tooltip} position="top">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    action.onClick();
                  }}
                  disabled={action.loading}
                  className="flex items-center justify-center"
                >
                  {action.loading ? (
                    <span className="w-4 h-4 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    action.iconPill
                  )}
                </button>
              </Tooltip>

              {idx < actionItems.length - 1 && (
                <span className="w-px h-4 bg-gray-300" />
              )}
            </div>
          ))}
        </div>

        {retriggerConfirmModal}
        {formSchema && showForm && createPortal(
          <ReviewForm onClose={() => setShowForm(false)}>
            <FormPreview
              containerId={`flow-stage-${stage.stage_name}-form-preview`}
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
        {showActModal && (
          <ActModal
            stage={stage}
            stageIndex={stageIndex}
            stages={stages}
            initiatorForms={initiatorForms}
            actions={actionsList}
            onAction={(action) => onAction(action, stage?.todo)}
            recordId={stage?.todo?.name}
            onClose={() => setShowActModal(false)}
          />
        )}
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
            disabled={action.loading}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors bg-primary hover:bg-primary/95 text-white border border-transparent ${getColSpanClass(idx, actionItems.length)}`}
          >
            {action.loading ? (
              <span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {action.iconButton}
                <Typography variant="bodySmall" color="white" className="font-semibold">
                  {action.label}
                </Typography>
              </>
            )}
          </button>
        ))}
      </div>

      {retriggerConfirmModal}
      {formSchema && showForm && createPortal(
        <ReviewForm onClose={() => setShowForm(false)}>
          <FormPreview
            containerId={`flow-stage-${stage.stage_name}-form-preview`}
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
      {showActModal && (
        <ActModal
          stage={stage}
          stageIndex={stageIndex}
          stages={stages}
          initiatorForms={initiatorForms}
          actions={actionsList}
          onAction={(action) => onAction(action, stage?.todo)}
          recordId={stage?.todo?.name}
          onClose={() => setShowActModal(false)}
        />
      )}
    </>
  );
};

export default FlowStageActions;
