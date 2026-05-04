
import { FlowRequestItem, FlowRequestStage, Attachment } from "../../../../types/flows";
import StatusBadge from "../../../shared/atoms/statusBadge";
import { Typography } from "../../../shared/atoms/Typography";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import { useMemo, useState } from "react";

import { extractAllocatedToUserArray, extractRolesAndUsers, FormIOForm } from "../../../../utils/flowUtils";
import AllocatedToTooltip from "../../../shared/AllocatedToTooltip";
import ReviewForm from "../../Separation/components/ReviewForm";
import { createPortal } from "react-dom";
import Button from "../../../shared/atoms/Button";
import AttachmentPreview from "./AttachmentPreview";
import FormPreview from "../../../shared/molecules/FormPreview";
import ActModal from "./ActModal";
import { Zap } from "lucide-react";
import { handleActionType } from "../../../../hooks/userApprovalList";

const FlowTableRow = ({
  stage,
  isActive,
  stages,
  stageIndex,
  initiatorForms,
  handleAction,
}: {
  stage: FlowRequestStage;
  isActive: boolean;
  stages: FlowRequestStage[];
  stageIndex: number;
  initiatorForms?: FlowRequestItem["initiator_forms"];
  handleAction: handleActionType;
}) => {
  const actions = stage?.todo?.custom_doctype_actions
    ? JSON.parse(stage?.todo?.custom_doctype_actions)
    : [];
  const actionsWithForm = stage?.todo?.custom_doctype_actions_with_form
    ? JSON.parse(
      stage?.todo?.custom_doctype_actions_with_form.replace(/'/g, '"'),
    )
    : [];

  const onAction = (action: string, data: FlowRequestStage["todo"]) => {
    handleAction(action, {
      todo_id: data.name,
      custom_approval_type: data?.custom_approval_type ?? "Approval Matrix",
      custom_open_chatnext_assistant_on_action:
        actionsWithForm.includes(action),
    });
  };
  const { data: currentUser } = useCurrentUser();

  const allocatedTo = useMemo(() => extractRolesAndUsers(stage), [stage]);
  const allocatedToUserArray = extractAllocatedToUserArray(allocatedTo.users);
  const canPerformActions = useMemo(() => {
    if (!isActive || !stage.can_act) return false;
    let actionPermission = false;

    if (allocatedToUserArray && currentUser?.name)
      actionPermission = allocatedToUserArray.includes(currentUser?.name);

    if (currentUser?.roles && allocatedTo?.roles)
      actionPermission ||= currentUser.roles.some((role) =>
        allocatedTo.roles.includes(role.role),
      );

    return actionPermission;
  }, [currentUser, isActive, allocatedTo, stage.can_act, allocatedToUserArray]);


  const [formSchema, setFormSchema] = useState<FormIOForm | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showActModal, setShowActModal] = useState(false);
  const [responseData, setResponseData] = useState<{ addAttachment?: Attachment[] } | null>(null);
  const [formAnswer, setFormAnswer] = useState<Record<string, unknown>>({});

  const handleShowForm = () => {
    if (!stage?.form_json?.components) return;

    const schema = stage.form_json.components;

    let data: Record<string, unknown> = {};

    try {
      data = stage?.approval_response_data
        ? JSON.parse(stage.approval_response_data)
        : {};
    } catch (error) {
      console.error("Invalid approval_response_data JSON:", error);
      data = {};
    }
    setFormSchema({ display: "form", components: schema });
    setFormAnswer(data);
    setResponseData(data);
    setShowForm(true);
  };

  return (
    <div
      key={stage.stage_name}
      className="hover:bg-primary-100 px-6 py-4 text-center grid grid-cols-5 cursor-pointer text-xs w-full border-b"
    >
      <div>
        {" "}
        <Typography variant="bodySmall" className="font-medium text-center">
          {stage.stage_name || "-"}
        </Typography>
      </div>
      <div>
        {" "}

        <AllocatedToTooltip
          position="right"
          users={stage.allocated_to}
          roles={allocatedTo.roles}
          role={stage.role || ""}
        >
          <StatusBadge status={stage.status || "-"} />
        </AllocatedToTooltip>

      </div>
      <div>
        {" "}
        <Typography variant="bodySmall" className="font-medium text-center">
          {formatToIndianDate(stage?.todo?.date) || "-"}
        </Typography>
      </div>
      <div>
        {" "}
        <Typography variant="bodySmall" className="font-medium text-center">
          {formatToIndianDate(stage.completion_date || "") || "-"}
        </Typography>
      </div>
      <div className="flex items-center justify-center pr-2">
        {" "}

        <>
          {stage?.approval_response_data && (
            <Button
              variant="outline"
              onClick={handleShowForm}
            >
              Review Form
            </Button>
          )}
          {canPerformActions && (
            <Button
              variant="soft"
              bgColor="primary"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowActModal(true);
              }}
              icon={<Zap size={14} strokeWidth={2.5} />}
            >
              Act
            </Button>
          )}
        </>
      </div>
      {formSchema && showForm && createPortal(
        <ReviewForm onClose={() => setShowForm(false)}>
          <FormPreview
            containerId={`flow-stage-${stage.stage_name}-form-preview`}
            schema={formSchema}
            submissionData={formAnswer}
            readOnly={true}
          />
          <AttachmentPreview attachments={responseData?.addAttachment || []} />
        </ReviewForm>,
        document.body,
      )}
      {showActModal && (
        <ActModal
          stage={stage}
          stageIndex={stageIndex}
          stages={stages}
          initiatorForms={initiatorForms}
          actions={actions}
          onAction={(action) => onAction(action, stage?.todo)}
          recordId={stage?.todo?.name}
          onClose={() => setShowActModal(false)}
        />
      )}
    </div>
  );
};


export default FlowTableRow;