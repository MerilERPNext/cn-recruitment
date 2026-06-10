import { useMemo, useState } from "react";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import {
  Attachment,
  FlowRequestItem,
  FlowRequestStage,
} from "../../../../types/flows";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import StatusBadge from "../../../shared/atoms/statusBadge";
import { Typography } from "../../../shared/atoms/Typography";

import { createPortal } from "react-dom";
import { handleActionType } from "../../../../hooks/userApprovalList";
import {
  extractAllocatedToUserArray,
  extractRolesAndUsers,
  FormIOForm,
  getStageActorDetails,
} from "../../../../utils/flowUtils";
import { getStageAssignedUsersCell } from "../../../../utils/getAssignedUsersCell";
import AllocatedToTooltip from "../../../shared/AllocatedToTooltip";
import Button from "../../../shared/atoms/Button";
import FormPreview from "../../../shared/molecules/FormPreview";
import WrapperHoverCard from "../../../shared/WrapperHoverCard";
import ReviewForm from "../../Separation/components/ReviewForm";
import ActModal from "./ActModal";
import AttachmentPreview from "./AttachmentPreview";
import MyApprovalActionPill from "../../../shared/atoms/MyApprovalActionPill";

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

  const onAction = (action: string, data: FlowRequestStage["todo"]) => {
    handleAction(action, {
      todo_id: data.name,
      custom_approval_type: data?.custom_approval_type ?? "Approval Matrix",
      custom_open_chatnext_assistant_on_action:
        actionsWithForm.includes(action),
    });
    setShowActModal(false);
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

  const actorDetails = useMemo(() => {
    if (!stage.approval_time) return null;
    return getStageActorDetails(
      stage.allocated_to,
      stage?.role_assigned_users,
      stage.user_id,
      stage.user,
    );
  }, [stage]);

  const [formSchema, setFormSchema] = useState<FormIOForm | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showActModal, setShowActModal] = useState(false);
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

  return (
    <div
      key={stage.stage_name}
      className="hover:bg-primary-100 px-6 py-4 grid grid-cols-8 items-center text-center cursor-pointer text-xs w-full border-b gap-4"
    >
      <div className="flex justify-center items-center">
        <Typography variant="bodySmall" className="font-medium text-center">
          {stage.stage_name || "-"}
        </Typography>
      </div>

      <div className="flex justify-center items-center">
        {getStageAssignedUsersCell(
          stage,
          stage?.role_assigned_users,
          "right",
          (text) => (
            <Typography
              variant="bodySmall"
              className="font-medium text-center text-primary-600 cursor-pointer underline"
            >
              {text}
            </Typography>
          ),
        )}
      </div>

      <div className="flex justify-center items-center overflow-hidden">
        {stage.approval_time && actorDetails ? (
          <WrapperHoverCard
            employeeId={actorDetails.employee}
            placement="center-left"
          >
            <Typography
              variant="bodySmall"
              className="font-medium truncate text-center cursor-pointer text-primary-600 hover:underline"
            >
              {actorDetails.name}
            </Typography>
          </WrapperHoverCard>
        ) : (
          <Typography
            variant="bodySmall"
            className="font-medium truncate text-center"
          >
            -
          </Typography>
        )}
      </div>

      <div className="flex justify-center items-center">
        <AllocatedToTooltip
          position="right"
          users={stage.allocated_to}
          roles={allocatedTo.roles}
          RoleAssignedUsers={stage?.role_assigned_users || []}
        >
          <StatusBadge status={stage.status || "-"} />
        </AllocatedToTooltip>
      </div>

      <div className="flex justify-center items-center">
        <Typography variant="bodySmall" className="font-medium text-center">
          {formatToIndianDate(stage?.todo?.creation) || "-"}
        </Typography>
      </div>

      <div className="flex justify-center items-center">
        <Typography variant="bodySmall" className="font-medium text-center">
          {formatToIndianDate(stage?.todo?.date) || "-"}
        </Typography>
      </div>

      <div className="flex justify-center items-center">
        <Typography variant="bodySmall" className="font-medium text-center">
          {formatToIndianDate(stage.completion_date || "") || "-"}
        </Typography>
      </div>
      <div className={`flex items-center justify-center `}>
        <MyApprovalActionPill
          uiPermission={{
            app: "HR Process",
            page: "Flow Requests",
            actionKeysMap: {
              nudge: "nudge",
            }
          }}

          todoId={stage?.todo?.name }
         
        />
        </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <>
          {(stage?.approval_response_data_display ||
            stage?.approval_response_data) && (
              <Button variant="outline" onClick={handleShowForm}>
                Review Form
              </Button>
            )}
          {canPerformActions && (
            <Button
              variant="contain"
              bgColor="primary"
              size="md"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowActModal(true);
              }}
            >
              Act
            </Button>
          )}
        </>
      </div>
      {formSchema &&
        showForm &&
        createPortal(
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
