import { useMemo } from "react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { FlowRequestItem } from "../../../types/flows";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { truncateByChars } from "../../../utils/sanitizeToPlainText";
import StatusBadge from "../../shared/atoms/statusBadge";
import { Typography } from "../../shared/atoms/Typography";
import Tooltip from "../../shared/Tooltip";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import AllocatedToTooltip from "../../shared/AllocatedToTooltip";
import MobileAllocatedTo from "../../shared/MobileAllocatedTo";


interface FlowRequestCardProps {
    request: FlowRequestItem;
    handleShowDetails: (data: FlowRequestItem) => void;
}
const FlowRequestCard: React.FC<FlowRequestCardProps> = ({
    request,
    handleShowDetails,
}) => {
    const { isDesktop } = useScreenSize();

    const pendingApprovalAllocatedTo = useMemo(() => {
        if (request.approval_status.toLowerCase() !== "pending") return null;
        const stage = request.approval_stages?.find(stage => stage.status.toLocaleLowerCase() === "pending");
        if (!stage) return null;
        return {
            allocated_to: stage.allocated_to,
            role_assigned_users: stage.role_assigned_users
        };
    }, [request.approval_status, request.approval_stages]);

    // const pendingWorkflowAllocatedTo = useMemo(() => {
    //     if (request.workflow_status.toLowerCase() !== "pending") return null;
    //     const stage = request.workflow_stages?.find(stage => stage.status.toLocaleLowerCase() === "pending");
    //     if (!stage) return null;
    //     return {
    //         allocated_to: stage.allocated_to,
    //         role_assigned_users: stage.role_assigned_users
    //     };
    // }, [request.workflow_status, request.workflow_stages]);



    if (!isDesktop) {
        return (
            <div className="rounded-2xl my-2 border-t-4 border-x-1 border-b-1 border-x-primary/20 border-b-primary/20 shadow-sm border-primary p-6 transition-shadow duration-200 flex flex-col gap-3 bg-white cursor-pointer" onClick={() => handleShowDetails(request)}>
                <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                        <Typography variant="mobileCardLabel" className="block">
                            Flow Name
                        </Typography>
                        <Typography variant="mobileCardValue">
                            {request.flow_name}
                        </Typography>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <Typography variant="mobileCardLabel">
                            Approval Status
                        </Typography>
                        <StatusBadge status={request.approval_status} />
                        {/* {pendingApprovalAllocatedTo && (
                            <MobileAllocatedTo
                                users={pendingApprovalAllocatedTo?.allocated_to}
                                RoleAssignedUsers={pendingApprovalAllocatedTo?.role_assigned_users}
                                align="right"
                                showLabel={false}
                            />
                        )} */}
                    </div>
                </div>

                <div className="flex justify-between">
                    <div className="flex flex-col gap-1">
                        <Typography variant="mobileCardLabel" className="block">
                            Category
                        </Typography>
                        <Typography variant="mobileCardValue">
                            {request.category}
                        </Typography>
                    </div>

                    <div className="flex flex-col gap-1 text-right">
                        <Typography variant="mobileCardLabel" className="block">
                            Initiated On
                        </Typography>
                        <Typography variant="mobileCardValue">
                            {formatToIndianDate(request.initiated_on)}
                        </Typography>
                    </div>
                </div>

                <div className="flex justify-between">
                    <div className="flex flex-col gap-1">
                        <Typography variant="mobileCardLabel" className="block">
                            Initiated By
                        </Typography>
                        <Typography variant="mobileCardValue">
                            {request.initiated_by}
                        </Typography>
                    </div>

                    <div className="flex flex-col gap-1 text-right">
                        <Typography variant="mobileCardLabel" className="block">
                            Initiated For
                        </Typography>
                        <Typography variant="mobileCardValue">
                            {request.initiated_for}
                        </Typography>
                    </div>
                </div>


                <div>
                    <div className="h-[1px] w-full bg-gray-100 mb-4" />
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col gap-1">
                            {/* <Typography variant="caption" className="text-gray-500">
                                Workflow Status
                            </Typography>
                            <StatusBadge status={request.workflow_status} />
                            {pendingWorkflowAllocatedTo && (
                                <MobileAllocatedTo
                                    users={pendingWorkflowAllocatedTo?.allocated_to}
                                    RoleAssignedUsers={pendingWorkflowAllocatedTo?.role_assigned_users}
                                    align="left"
                                    showLabel={false}
                                />
                            )} */}
                            {pendingApprovalAllocatedTo && (
                                <MobileAllocatedTo
                                    users={pendingApprovalAllocatedTo?.allocated_to}
                                    RoleAssignedUsers={pendingApprovalAllocatedTo?.role_assigned_users}
                                    align="right"
                                    showLabel={false}
                                />
                            )}
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                            <Typography variant="caption" className="text-gray-500">
                                Overall Status
                            </Typography>
                            <StatusBadge status={request.overall_flow_status} />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="px-4 py-3 grid grid-cols-[1fr_1fr_150px_150px_150px_150px_150px] gap-4 text-center cursor-pointer hover:bg-blue-50" onClick={() => handleShowDetails(request)}>
            <div>  <Typography variant="bodySmall" className="font-medium text-center"><Tooltip content={request.flow_name}>{truncateByChars(request.flow_name, 40)}</Tooltip></Typography></div>
            <div><Typography variant="bodySmall" className="font-medium text-center"><Tooltip content={request.category}>{truncateByChars(request.category, 40)}</Tooltip></Typography></div>
            <div><Typography variant="bodySmall" className="font-medium text-center">{formatToIndianDate(request.initiated_on)}</Typography></div>
            <div><Typography variant="bodySmall" className="font-medium text-center"><WrapperHoverCard employeeId={request.initiated_by_emp_id}>{truncateByChars(request.initiated_by, 15)}</WrapperHoverCard></Typography></div>
            <div><Typography variant="bodySmall" className="font-medium text-center"><WrapperHoverCard employeeId={request.initiated_for_emp_id}>{truncateByChars(request.initiated_for, 15)}</WrapperHoverCard></Typography></div>
            <div><AllocatedToTooltip users={pendingApprovalAllocatedTo?.allocated_to || []} RoleAssignedUsers={pendingApprovalAllocatedTo?.role_assigned_users || []} position="left"><StatusBadge status={request.approval_status} /></AllocatedToTooltip></div>
            {/* <div><AllocatedToTooltip users={pendingWorkflowAllocatedTo?.allocated_to || []} RoleAssignedUsers={pendingWorkflowAllocatedTo?.role_assigned_users || []} position="left"><StatusBadge status={request.workflow_status} /></AllocatedToTooltip></div> */}
            <div><StatusBadge status={request.overall_flow_status} /></div>
        </div>
    );
};

export default FlowRequestCard;