import React, { useMemo } from 'react'
import { FlowRequestItem, WorkflowStage } from '../../../types/flows';
import CardTable from '../../shared/CardTable';
import { Typography } from '../../shared/atoms/Typography';
import StatusBadge from '../../shared/atoms/statusBadge';
import formatToIndianDate from '../../../utils/formatToIndianDate';
import useCurrentUser from '../../../hooks/useCurrentUser'
import { useApprovalAction } from '../../../hooks/userApprovalList';
import { useScreenSize } from '../../../hooks/useScreenSize';
import Button from '../../shared/atoms/Button';

interface WorkflowTableProps {
    data: FlowRequestItem;
};

const titles = [
    "Stage No.",
    "Assigned To",
    "Status",
    "Due Date",
    "Actions",
];

const WorkflowTable: React.FC<WorkflowTableProps> = ({ data }) => {
    const { isDesktop } = useScreenSize();
    const EmptyState = () => {
        return (
            <div className="py-14 text-center text-sm font-medium text-gray-500">
                No Records Found
            </div>
        );
    };

    const activeStageIndex = data.workflow_stages.findIndex((stage) => stage.status === "Pending");

    return (
        <div className="sm:px-7 px-4">
            <CardTable titles={titles}>
                {isDesktop ? (
                    <div className="w-full overflow-x-auto rounded-lg  border border-gray-200 bg-white shadow-sm">
                        <div className="w-full">
                            {data.workflow_stages.length > 0 ? (
                                data.workflow_stages.map((stage, idx) => (
                                    <WorkflowCard key={idx} stage={stage} idx={idx} isActive={idx === activeStageIndex} />
                                ))
                            ) : (
                                <EmptyState />
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 py-2">
                        {data.workflow_stages.length > 0 ? (
                            data.workflow_stages.map((stage, idx) => (
                                <WorkflowCard key={idx} stage={stage} idx={idx} isActive={idx === activeStageIndex} />
                            ))
                        ) : (
                            <EmptyState />
                        )}
                    </div>
                )}
            </CardTable>
        </div>);
}


const WorkflowCard = ({ stage, idx, isActive }: { stage: WorkflowStage, idx: number, isActive: boolean }) => {
    const actions = stage?.todo?.custom_doctype_actions
        ? JSON.parse(stage?.todo?.custom_doctype_actions)
        : [];
    const actionsWithForm = stage?.todo?.custom_doctype_actions_with_form
        ? JSON.parse(stage?.todo?.custom_doctype_actions_with_form.replace(/'/g, '"'))
        : [];


    const { isDesktop } = useScreenSize();

    const { handleAction } = useApprovalAction();

    const onAction = (action: string, data: any) => {
        handleAction(
            action,
            {
                todo_id: data.name,
                custom_approval_type: data.custom_approval_type,
                custom_open_chatnext_assistant_on_action: actionsWithForm.includes(action)
            }, "Action Performed Successfully");
    };
    // const { data: userId } = useLoggedInUser();
    const { data: currentUser } = useCurrentUser();
    // const { data: currentEmployee } =
    //     useCurrentEmployeeAllDetails(userId || "");

    const canPerformActions = useMemo(() => {
        if (!isActive) return false;
        let actionPermission = false;

        if (stage?.todo?.allocated_to && currentUser?.name)
            actionPermission = stage?.todo?.allocated_to === currentUser.name;

        if (currentUser?.roles && stage?.todo?.role)
            actionPermission ||= currentUser.roles.some(
                (role) => role.role === stage?.todo?.role,
            );

        return actionPermission;
    }, [currentUser, stage, isActive]);
    return (
        isDesktop ? (<div
            key={idx}
            className="hover:bg-gray-100 py-4 text-center grid grid-cols-5 cursor-pointer text-xs w-full border-b"
        >
            <div>  <Typography variant="bodySmall" className="font-medium text-center">
                {idx + 1}
            </Typography></div>
            <div>  <Typography variant="bodySmall" className="font-medium text-center">
                {stage.target_name || stage.target || "-"}
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
                {canPerformActions &&
                    // <TeamApprovalActionPill
                    //     actions={actions}
                    //     status={stage?.todo?.status}
                    //     recordId={stage?.todo?.name}
                    //     // loadingAction={loadingAction}
                    //     onAction={(action) => onAction(action, stage?.todo)}
                    // />
                    <Button onClick={() => onAction(actions[0], stage?.todo)} >Act</Button>
                }
            </Typography></div>
        </div>) : (
            <div key={idx} className="rounded-2xl my-2 border-t-4 border-x-1 border-b-1 border-x-primary/20 border-b-primary/20 bg-white shadow-sm border-primary p-6 transition-shadow duration-200 flex flex-col gap-5">
                <div className="flex justify-between items-start mb-1">
                    <div className="flex flex-col gap-2">
                        <Typography variant="mobileCardLabel" className="block uppercase tracking-wide">
                            Stage {idx + 1}
                        </Typography>
                        <Typography variant="mobileCardValue">
                            {stage.target_name || stage.target || "-"}
                        </Typography>
                    </div>
                    <div className="flex-shrink-0">
                        <StatusBadge status={stage.status || "-"} />
                    </div>
                </div>

                <div className="flex justify-between">
                    <div className="flex flex-col gap-2">
                        <Typography variant="mobileCardLabel" className="block">
                            Assigned To
                        </Typography>
                        <Typography variant="mobileCardValue">
                            {stage.todo?.allocated_to || stage.todo?.role || "-"}
                        </Typography>
                    </div>

                    <div className="flex flex-col gap-2 text-right">
                        <Typography variant="mobileCardLabel" className="block">
                            Date
                        </Typography>
                        <Typography variant="mobileCardValue">
                            {formatToIndianDate(stage.todo?.date) || "-"}
                        </Typography>
                    </div>
                </div>

                {canPerformActions && (
                    <div>
                        <div className="h-[1px] w-full bg-gray-100 mb-4" />
                        <Button className="w-full" onClick={() => onAction(actions[0], stage?.todo)}>Act</Button>
                    </div>
                )}
            </div>
        )
    )
}


export default WorkflowTable