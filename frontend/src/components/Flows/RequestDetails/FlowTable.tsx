/* eslint-disable @typescript-eslint/no-explicit-any */
import RequestTimeline from "./RequestDetailsTimeline";
import CardTable from "../../shared/CardTable";
import { useScreenSize } from "../../../hooks/useScreenSize";

import StatusBadge from "../../shared/atoms/statusBadge";
import { Typography } from "../../shared/atoms/Typography";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import TeamApprovalActionPill from "../../shared/atoms/TeamApprovalActionPill";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCallback, useMemo } from "react";
import { useApprovalAction } from "../../../hooks/userApprovalList";
import { FlowRequestItem, FlowRequestStage } from "../../../types/flows";
import { StaticListView } from "../../ListView";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import { extractRolesAndUsers } from "../../../utils/flowUtils";
import AllocatedToTooltip from "../../shared/AllocatedToTooltip";
import { useQueryClient } from "@tanstack/react-query";

const titles = [
  "Stage Name",
  "Status",
  "Due Date",
  "Completed Date",
  "Actions",
];

interface FlowTableProps {
  data: FlowRequestItem;
}

const FlowTable: React.FC<FlowTableProps> = ({ data }) => {
  const { isDesktop } = useScreenSize();
  const activeStageIndex =
    data.approval_status === "Pending"
      ? data.approval_stages.findIndex((stage) => stage.status === "Pending")
      : -1;

  return (
    <div className="sm:px-7 px-4">
      {isDesktop ? (
        <CardTable titles={titles}>
          <StaticListView
            data={data.approval_stages}
            ItemComponent={(index, item) => (
              <StageCard stage={item} isActive={index === activeStageIndex} />
            )}
            isSearch={true}
            searchFields={["stage_name", "role", "status"]}
            getItemKey={(stage, index) => stage?.stage_name + index}
            pageSize={20}
            SkeletonComponent={CardSkeleton}
            loadMorePagination={true}
          />
        </CardTable>
      ) : (
        <div className="pb-10 overflow-y-auto">
          <RequestTimeline
            stages={data.approval_stages}
            activeStageIndex={activeStageIndex}
          />
        </div>
      )}
    </div>
  );
};

const StageCard = ({
  stage,
  isActive,
}: {
  stage: FlowRequestStage;
  isActive: boolean;
}) => {
  const actions = stage?.todo?.custom_doctype_actions
    ? JSON.parse(stage?.todo?.custom_doctype_actions)
    : [];
  const actionsWithForm = stage?.todo?.custom_doctype_actions_with_form
    ? JSON.parse(
        stage?.todo?.custom_doctype_actions_with_form.replace(/'/g, '"'),
      )
    : [];

  const queryClient = useQueryClient();
  const triggerRefetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["employee-flow-requests"] });
  }, [queryClient]);

  const { handleAction } = useApprovalAction(triggerRefetch);

  const onAction = (action: string, data: any) => {
    handleAction(action, {
      todo_id: data.name,
      custom_approval_type: data.custom_approval_type,
      custom_open_chatnext_assistant_on_action:
        actionsWithForm.includes(action),
    });
  };
  const { data: currentUser } = useCurrentUser();

  const allocatedTo = useMemo(() => extractRolesAndUsers(stage), [stage]);
  const canPerformActions = useMemo(() => {
    if (!isActive) return false;
    let actionPermission = false;

    if (allocatedTo?.users && currentUser?.name)
      actionPermission = allocatedTo.users.includes(currentUser?.name);

    if (currentUser?.roles && allocatedTo?.roles)
      actionPermission ||= currentUser.roles.some((role) =>
        allocatedTo.roles.includes(role.role),
      );

    return actionPermission;
  }, [currentUser, isActive, allocatedTo]);

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
        <Typography variant="bodySmall" className="font-medium text-center">
          <AllocatedToTooltip
            position="right"
            users={allocatedTo.users}
            roles={allocatedTo.roles}
          >
            <StatusBadge status={stage.status || "-"} />
          </AllocatedToTooltip>
        </Typography>
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
        <Typography variant="bodySmall" className="font-medium text-center">
          {canPerformActions && (
            <TeamApprovalActionPill
              actions={actions}
              status={stage?.status}
              recordId={stage?.todo?.name}
              // loadingAction={loadingAction}
              onAction={(action) => onAction(action, stage?.todo)}
            />
          )}
        </Typography>
      </div>
    </div>
  );
};

export default FlowTable;
