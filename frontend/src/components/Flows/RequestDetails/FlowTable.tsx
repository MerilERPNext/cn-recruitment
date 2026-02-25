
import RequestTimeline from "./RequestDetailsCard";
import CardTable from "../../shared/CardTable";
import { useScreenSize } from "../../../hooks/useScreenSize";

import StatusBadge from "../../shared/atoms/statusBadge";
import { Typography } from "../../shared/atoms/Typography";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import TeamApprovalActionPill from "../../shared/atoms/TeamApprovalActionPill";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useMemo } from "react";
import { useApprovalAction } from "../../../hooks/userApprovalList";
import { FlowRequestItem, FlowRequestStage } from "../../../types/flows";
import Tooltip from "../../shared/Tooltip";
import { StaticListView } from "../../ListView";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";

const titles = [
    "Stage Name",
    "Assigned To",
    "Status",
    "Due Date",
    "Completed Date",
    "Actions",
];


interface FlowTableProps {
    data: FlowRequestItem;
};

const FlowTable: React.FC<FlowTableProps> = ({ data }) => {
    const { isDesktop } = useScreenSize();
    const activeStageIndex = data.approval_stages.findIndex((stage) => stage.status === "Pending");

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
                <div className="pb-10">
                    <RequestTimeline stages={data.approval_stages} />
                </div>
            )}
        </div>
    )
}


const StageCard = ({ stage, isActive }: { stage: FlowRequestStage, isActive: boolean }) => {
    const actions = stage?.todo?.custom_doctype_actions
        ? JSON.parse(stage?.todo?.custom_doctype_actions)
        : [];
    const actionsWithForm = stage?.todo?.custom_doctype_actions_with_form
        ? JSON.parse(stage?.todo?.custom_doctype_actions_with_form.replace(/'/g, '"'))
        : [];


    const { handleAction } = useApprovalAction();

    const onAction = (action: string, data: any) => {
        handleAction(
            action,
            {
                todo_id: data.name,
                custom_approval_type: data.custom_approval_type,
                custom_open_chatnext_assistant_on_action: actionsWithForm.includes(action)
            });
    };
    const { data: userId } = useLoggedInUser();
    const { data: currentUser } = useCurrentUser();
    const { data: currentEmployee } =
        useCurrentEmployeeAllDetails(userId || "");

    const canPerformActions = useMemo(() => {
        if (!isActive) return false;
        let actionPermission = false;

        if (stage?.todo?.allocated_to_emp_id && currentEmployee?.name)
            actionPermission = stage?.todo?.allocated_to_emp_id === currentEmployee.name;

        if (currentUser?.roles && stage?.role)
            actionPermission ||= currentUser.roles.some(
                (role) => role.role === stage.role,
            );

        return actionPermission;
    }, [currentEmployee, currentUser, stage, isActive]);

    return (
        <div
            key={stage.stage_name}
            className="hover:bg-primary-100 py-4 text-center grid grid-cols-6 cursor-pointer text-xs w-full border-b"
        >
            <div>  <Typography variant="bodySmall" className="font-medium text-center">
                {stage.stage_name || "-"}
            </Typography></div>
            <div>  <Typography variant="bodySmall" className="font-medium text-center">
                {stage.role || stage.user || "-"}
            </Typography></div>
            <div>  <Typography variant="bodySmall" className="font-medium text-center">
                <Tooltip content={stage.user_id}>
                    <StatusBadge
                        status={stage.status || "-"}
                    />
                </Tooltip>
            </Typography></div>
            <div>  <Typography variant="bodySmall" className="font-medium text-center">
                {formatToIndianDate(stage.todo.date) || "-"}
            </Typography></div>
            <div>  <Typography variant="bodySmall" className="font-medium text-center">
                {formatToIndianDate(stage.completion_date || "") || "-"}
            </Typography></div>
            <div className="flex items-center justify-center pr-2">  <Typography variant="bodySmall" className="font-medium text-center">
                {canPerformActions ?
                    <TeamApprovalActionPill
                        actions={actions}
                        status={stage?.todo?.status}
                        recordId={stage?.todo?.name}
                        // loadingAction={loadingAction}
                        onAction={(action) => onAction(action, stage?.todo)}
                    /> :
                    <div className="h-8 px-3 flex items-center  justify-center rounded-3xl bg-gray-10 text-gray-600 text-xs font-medium w-fit">
                        NA
                    </div>
                }
            </Typography></div>
        </div>
    )
}

export default FlowTable