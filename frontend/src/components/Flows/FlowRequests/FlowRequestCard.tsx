import { useMemo } from "react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { FlowRequestItem } from "../../../types/flows";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { truncateByChars } from "../../../utils/sanitizeToPlainText";
import StatusBadge from "../../shared/atoms/statusBadge";
import { Typography } from "../../shared/atoms/Typography";
import Tooltip from "../../shared/Tooltip";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
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
            <div
                className="rounded-2xl my-2 border border-gray-200 shadow-sm bg-white cursor-pointer active:scale-[0.99] transition-all duration-200 overflow-hidden"
                onClick={() => handleShowDetails(request)}
            >
                {/* Header: Flow Name + Approval Badge */}
                <div className="bg-gradient-to-r from-primary/5 to-transparent px-5 pt-4 pb-3 border-b border-gray-100">
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <Typography variant="mobileCardLabel" className="block">
                                Flow Name
                            </Typography>
                            <Typography variant="mobileCardValue" className="truncate">
                                {request.flow_name}
                            </Typography>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <Typography variant="mobileCardLabel">
                                Approval
                            </Typography>
                            <StatusBadge status={request.approval_status} />
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="px-5 py-3 flex flex-col gap-3">
                    {/* Flow ID */}
                    <div className="flex items-center justify-between bg-slate-50/70 border border-slate-100/80 rounded-lg px-3 py-1.5 transition-colors duration-150">
                        <div className="flex items-center gap-1 text-slate-400">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                            </svg>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-brand">Flow ID</span>
                        </div>
                        <span className="font-mono text-xs font-semibold text-slate-600 select-all">
                            {request.request_id}
                        </span>
                    </div>

                    {/* Category + Initiated On */}
                    <div className="flex justify-between gap-x-2">
                        <div className="flex flex-col gap-0.5">
                            <Typography variant="mobileCardLabel" className="block">
                                Category
                            </Typography>
                            <Typography variant="mobileCardValue">
                                {request.category}
                            </Typography>
                        </div>
                        <div className="flex flex-col gap-0.5 text-right">
                            <Typography variant="mobileCardLabel" className="block">
                                Initiated On
                            </Typography>
                            <Typography variant="mobileCardValue">
                                {formatToIndianDate(request.initiated_on)}
                            </Typography>
                        </div>
                    </div>

                    {/* Initiated By + Initiated For */}
                    <div className="flex justify-between gap-x-2">
                        <div className="flex flex-col gap-0.5">
                            <Typography variant="mobileCardLabel" className="block">
                                Initiated By
                            </Typography>
                            <Typography variant="mobileCardValue">
                                {request.initiated_by}
                            </Typography>
                        </div>
                        <div className="flex flex-col gap-0.5 text-right">
                            <Typography variant="mobileCardLabel" className="block">
                                Initiated For
                            </Typography>
                            <Typography variant="mobileCardValue">
                                {request.initiated_for}
                            </Typography>
                        </div>
                    </div>
                </div>

                {/* Footer: Allocated To + Overall Status */}
                <div className="px-5 pb-4">
                    <div className="h-[1px] w-full bg-gray-100 mb-3" />
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col gap-1">
                            {pendingApprovalAllocatedTo && (
                                <MobileAllocatedTo
                                    users={pendingApprovalAllocatedTo?.allocated_to}
                                    RoleAssignedUsers={pendingApprovalAllocatedTo?.role_assigned_users}
                                    align="left"
                                    showLabel={false}
                                />
                            )}
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                            <Typography variant="mobileCardLabel">
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
        <div className="px-4 py-3 grid grid-cols-[150px_1fr_1fr_150px_150px_150px_150px_150px] gap-4 text-center cursor-pointer hover:bg-blue-50" onClick={() => handleShowDetails(request)}>
            <div><Typography variant="bodySmall" className="font-medium text-center"><Tooltip content={request.request_id}>{truncateByChars(request.request_id, 15)}</Tooltip></Typography></div>
            <div>  <Typography variant="bodySmall" className="font-medium text-center"><Tooltip content={request.flow_name}>{truncateByChars(request.flow_name, 40)}</Tooltip></Typography></div>
            <div><Typography variant="bodySmall" className="font-medium text-center"><Tooltip content={request.category}>{truncateByChars(request.category, 40)}</Tooltip></Typography></div>
            <div><Typography variant="bodySmall" className="font-medium text-center">{formatToIndianDate(request.initiated_on)}</Typography></div>
            <div><Typography variant="bodySmall" className="font-medium text-center"><WrapperHoverCard employeeId={request.initiated_by_emp_id}>{truncateByChars(request.initiated_by, 15)}</WrapperHoverCard></Typography></div>
            <div><Typography variant="bodySmall" className="font-medium text-center"><WrapperHoverCard employeeId={request.initiated_for_emp_id}>{truncateByChars(request.initiated_for, 15)}</WrapperHoverCard></Typography></div>
            <div><StatusBadge status={request.approval_status} /></div>
            {/* <div><AllocatedToTooltip users={pendingWorkflowAllocatedTo?.allocated_to || []} RoleAssignedUsers={pendingWorkflowAllocatedTo?.role_assigned_users || []} position="left"><StatusBadge status={request.workflow_status} /></AllocatedToTooltip></div> */}
            <div><StatusBadge status={request.overall_flow_status} /></div>
        </div>
    );
};

export default FlowRequestCard;