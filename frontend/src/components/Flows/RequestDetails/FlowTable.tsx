
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
    const EmptyState = () => {
        return (
            <div className="py-14 text-center text-sm font-medium text-gray-500">
                No Records Found
            </div>
        );
    };

    return (
        <div className="sm:px-7 px-4">
            <CardTable titles={titles}>
                {isDesktop ? (
                    <div className="w-full overflow-x-auto rounded-lg  border border-gray-200 bg-white shadow-sm">
                        <div className="w-full">
                            {data.approval_stages.length > 0 ? (
                                data.approval_stages.map((stage, index) => (
                                    <StageCard stage={stage} isActive={index === activeStageIndex} />
                                ))
                            ) : (
                                <EmptyState />
                            )}
                        </div>
                    </div>
                ) : (
                    <div>
                        {data.approval_stages && data.approval_stages.length > 0 ? (
                            <RequestTimeline stages={data.approval_stages} />
                        ) : (
                            <EmptyState />
                        )}
                    </div>
                )}
            </CardTable>
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
            className="hover:bg-gray-100 py-4 text-center grid grid-cols-6 cursor-pointer text-xs w-full border-b"
        >
            <div>  <Typography variant="bodySmall" className="font-medium text-center">
                {stage.stage_name || "-"}
            </Typography></div>
            <div>  <Typography variant="bodySmall" className="font-medium text-center">
                {stage.role || stage.user || "-"}
            </Typography></div>
            <div>  <Typography variant="bodySmall" className="font-medium text-center">
                <StatusBadge
                    status={stage.status || "-"}
                />
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