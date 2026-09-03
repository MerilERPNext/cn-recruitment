import { useMemo } from "react";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import {
  FlowRequestItem,
  FlowRequestStage,
} from "../../../../types/flows";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import StatusBadge from "../../../shared/atoms/statusBadge";
import { Typography } from "../../../shared/atoms/Typography";

import { handleActionType } from "../../../../hooks/userApprovalList";
import {
  extractAllocatedToUserArray,
  extractRolesAndUsers,
  getStageActorDetails,
} from "../../../../utils/flowUtils";
import { getStageAssignedUsersCell } from "../../../../utils/getAssignedUsersCell";
import AllocatedToTooltip from "../../../shared/AllocatedToTooltip";
import WrapperHoverCard from "../../../shared/WrapperHoverCard";
import FlowStageActions from "./FlowStageActions";

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

  return (
    <div
      key={stage.stage_name}
      className="hover:bg-gray-50 px-6 py-4 grid grid-cols-8 items-center text-center cursor-pointer text-xs w-full border-b border-border gap-4 transition-colors"
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
      <div className="flex flex-wrap items-center justify-center gap-2">
        <FlowStageActions
          stage={stage}
          stages={stages}
          stageIndex={stageIndex}
          initiatorForms={initiatorForms}
          handleAction={handleAction}
          variant="pill"
          canAct={canPerformActions}
        />
      </div>
    </div>
  );
};

export default FlowTableRow;
