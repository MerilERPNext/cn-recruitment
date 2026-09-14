import React, { useMemo, useState } from "react";
import type { Attachment, FlowRequestStage } from "../../../types/flows";

import { FormIOComponent } from "../../../types/formio";
import ReviewForm from "../Separation/components/ReviewForm";
import { createPortal } from "react-dom";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import StatusTimelineItem from "./components/StatusTimelineItem";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import useCurrentUser, { isAdminUser } from "../../../hooks/useCurrentUser";
import { useActButtonSetting } from "../../../hooks/useActButtonSetting";
import ViewFormButton from "../ViewFormButton";
import { FormIOForm } from "../../../utils/flowUtils";
import AttachmentPreview from "../FlowRequests/FlowDetails/AttachmentPreview";
import FormPreview from "../../shared/molecules/FormPreview";
import NudgeButton from "../../shared/atoms/NudgeButton";
import StageRetriggerButton from "../StageRetriggerButton";

type handleActPropsType = {
  name: string;
  hasForm: boolean;
  todoId: string;
  customApprovalType?: "Approval Matrix" | "Multi Actions";
};

interface StageCardProps {
  stages: FlowRequestStage[];
  idx: number;
  showActButton?: boolean;
  canActOnThisRequest: boolean;
  handleAct: (handleActPropsType: handleActPropsType) => void;
}

const StageCard: React.FC<StageCardProps> = ({
  stages,
  idx,
  showActButton = false,
  canActOnThisRequest,
  handleAct,
}) => {
  const stage = stages[idx];
  const { data: currentUser } = useCurrentUser();
  const getStageStatus = (stage: { status: string }, idx: number) => {
    const isPending = stage?.status === "Pending";
    const prevIsPending = stages[idx - 1]?.status === "Pending";

    if (isPending && !prevIsPending) {
      return "action_required";
    }

    if (isPending) {
      return "pending";
    }

    return "completed";
  };
  const status = getStageStatus(stage, idx);

  const { data: showActOnAllTasks = false } = useActButtonSetting();

  const canPerformAction = useMemo(() => {
    if (!showActButton) return false;

    const isSystemManager = isAdminUser(currentUser || null);
    const isAssigned = Boolean(stage?.user_id || stage?.role);

    // System Manager: can act on ALL tasks if setting is ON, or on UNASSIGNED tasks if OFF
    if (isSystemManager && (showActOnAllTasks || !isAssigned)) {
      return true;
    }

    if (!canActOnThisRequest) return false;
    let actionPermission = false;
    if (stage?.user_id && currentUser?.name)
      actionPermission = stage.user_id === currentUser.name;

    if (currentUser?.roles && stage?.role)
      actionPermission ||= currentUser.roles.some(
        (role) => role.role === stage.role,
      );

    return actionPermission;
  }, [stage, currentUser, canActOnThisRequest, showActButton, showActOnAllTasks]);

  const [formSchema, setFormSchema] = useState<FormIOForm | null>(null);
  const [show, setShow] = useState(false);
  const [responseData, setResponseData] = useState<{ addAttachment?: Attachment[] } | null>(null);
  const [formAnswer, setFormAnswer] = useState<Record<string, unknown>>({});

  const actions = useMemo(() => {
    if (!stage?.todo?.custom_doctype_actions) return [];
    try {
      const parsed = JSON.parse(stage.todo.custom_doctype_actions);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse custom_doctype_actions", e);
      return [];
    }
  }, [stage?.todo?.custom_doctype_actions]);

  const filteredActions = useMemo(() => {
    return actions.filter((action: string) => action.toLowerCase() !== "reject");
  }, [actions]);

  const actionsWithForm = useMemo(() => {
    if (!stage?.todo?.custom_doctype_actions_with_form) return [];
    try {
      const formatted = stage.todo.custom_doctype_actions_with_form.replace(/'/g, '"');
      const parsed = JSON.parse(formatted);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse custom_doctype_actions_with_form", e);
      return [];
    }
  }, [stage?.todo?.custom_doctype_actions_with_form]);

  const handleShowForm = (
    schema: FormIOComponent[] | undefined,
    approval_response_data: string,
    parsedData?: Record<string, unknown>
  ) => {
    if (!schema) return;

    let data: Record<string, unknown> = parsedData || {};

    if (!data) {
      try {
        data = JSON.parse(approval_response_data);
      } catch (error) {
        console.error("Invalid approval_response_data JSON:", error);
        data = {};
      }
    }

    setFormSchema({ display: "form", components: schema });
    setFormAnswer(data);
    setShow(true);
  };

  const handleShowFormWithResponse = (
    schema: FormIOComponent[] | undefined,
    approval_response_data: string
  ) => {
    let data = null;
    try {
      data = JSON.parse(approval_response_data);
    } catch (error) {
      console.error("Invalid approval_response_data JSON:", error);
    }
    setResponseData(data);
    handleShowForm(schema, approval_response_data, data);
  }


  const approverPerfix =
    status == "pending"
      ? "Process yet to be trigger"
      : status == "completed"
        ? "Approved by "
        : "Pending input from ";

  return (
    <>
      <StatusTimelineItem isLast={idx === stages.length - 1} status={status} />

      <div className="grid lg:grid-cols-2 grid-cols-1 py-2">
        <div className="ml-4 flex flex-col">
          <Typography variant="bodyMedium">{stage?.stage_name}</Typography>
          <Typography variant="bodySmall">
            {approverPerfix} {status == "pending" ? "" : stage?.role || stage?.user}
          </Typography>
        </div>

        <div className="grid grid-cols-[1fr_auto] max-sm:grid-cols-1 gap-3 items-start px-4 pt-1 pb-3">
          <div className="flex flex-col items-start gap-3 max-sm:order-2">
            <div className="flex gap-3 items-center">
              {stage?.approval_response_data && stage?.status != "pending" && (
                <ViewFormButton
                  variant="contain"
                  size="sm"
                  onClick={() =>
                    handleShowFormWithResponse(
                      stage?.form_json?.components,
                      stage?.approval_response_data,
                    )
                  }
                />
              )}

              <NudgeButton
                todoId={stage?.todo?.name}
                app="HR Process"
                page="Confirmation"
                isPending={status === "action_required"}
                variant="contain"
                size="sm"
              />
              <StageRetriggerButton
                todoId={stage?.todo?.name}
                page="Confirmation"
              />
              {canPerformAction && status === "action_required" && filteredActions.length > 0 && (
                filteredActions.map((action: string) => (
                  <Button
                    key={action}
                    variant="contain"
                    onClick={() =>
                      handleAct({
                        name: action,
                        hasForm: actionsWithForm.includes(action),
                        todoId: stage?.todo?.name ?? "",
                        customApprovalType: stage?.todo?.custom_approval_type,
                      })
                    }
                    disabled={!stage?.todo?.name}
                  >
                    {action}
                  </Button>
                )))}


            </div>
          </div>
          <div className="justify-self-end max-sm:justify-self-start max-sm:order-3">
            {status == "action_required"
              ? "In Progress..."
              : formatToIndianDate(stage?.approval_time || "")}
          </div>
        </div>

        {/* <div>{stage?.user_id}</div> */}
      </div >
      {formSchema &&
        show &&
        createPortal(
          <ReviewForm onClose={() => setShow(false)}>
            <FormPreview
              containerId={`confirmation-stage-${idx}-form-preview`}
              schema={formSchema}
              submissionData={formAnswer}
              readOnly={true}
            />
            <AttachmentPreview attachments={responseData?.addAttachment || []} />
          </ReviewForm>,
          document.body,
        )
      }
    </>
  );
};

export default StageCard;
