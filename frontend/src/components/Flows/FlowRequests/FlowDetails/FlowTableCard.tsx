/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { Check, Clock, X, User } from "lucide-react";
import StatusBadge from "../../../shared/atoms/statusBadge";
import { FlowRequestItem, FlowRequestStage } from "../../../../types/flows";

import formatToIndianDate from "../../../../utils/formatToIndianDate";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import { extractRolesAndUsers, getStageActorDetails } from "../../../../utils/flowUtils";
import { Typography } from "../../../shared/atoms/Typography";
import MobileAllocatedTo from "../../../shared/MobileAllocatedTo";
import { handleActionType } from "../../../../hooks/userApprovalList";
import WrapperHoverCard from "../../../shared/WrapperHoverCard";
import FlowStageActions from "./FlowStageActions";

const getIcon = (status: string) => {
    const iconProps = { size: 20, strokeWidth: 3, className: "text-white" };

    switch (status) {
        case "Completed":
        case "Approved":
            return <Check {...iconProps} />;
        case "In Progress":
        case "Pending":
            return <Clock {...iconProps} />;
        case "Failed":
        case "Rejected":
            return <X {...iconProps} />;
        default:
            return <User {...iconProps} />;
    }
};

const getBgColor = (status: string) => {
    switch (status) {
        case "Completed":
        case "Approved":
            return "bg-green-500";
        case "In Progress":
            return "bg-yellow-500";
        case "Failed":
        case "Rejected":
            return "bg-red-500";
        case "Pending":
        default:
            return "bg-gray-400";
    }
};

interface RequestDetailCardProps {
    stage: FlowRequestStage;
    index: number;
    stages: FlowRequestStage[];
    isActive: boolean;
    initiatorForms?: FlowRequestItem["initiator_forms"];
    handleAction: handleActionType;
}

const FlowTableRow = ({
    stage,
    index,
    stages,
    isActive,
    initiatorForms,
    handleAction
}: RequestDetailCardProps) => {
    const isCompleted =
        stage.status === "Completed" || stage.status === "Approved";
    const nextStage = stages[index + 1];

    const { data: currentUser } = useCurrentUser();

    const allocatedTo = useMemo(() => extractRolesAndUsers(stage), [stage]);
    const canPerformActions = useMemo(() => {
        if (!isActive || !stage.can_act) return false;
        let actionPermission = false;

        if (allocatedTo?.users && currentUser?.name)
            actionPermission = allocatedTo.users.includes(currentUser?.name);

        if (currentUser?.roles && allocatedTo?.roles)
            actionPermission ||= currentUser.roles.some((role) =>
                allocatedTo.roles.includes(role.role),
            );

        return actionPermission;
    }, [currentUser, isActive, allocatedTo, stage.can_act]);

    const actorDetails = useMemo(() => {
        if (!stage.approval_time) return null;
        return getStageActorDetails(
            stage.allocated_to,
            stage?.role_assigned_users,
            stage.user_id,
            stage.user
        );
    }, [stage]);

    const lineColor =
        isCompleted &&
            nextStage?.status !== "Failed" &&
            nextStage?.status !== "Rejected"
            ? "bg-green-500"
            : "bg-gray-300";

    return (
        <div
            key={`${stage.stage_name}-${index}`}
            className={`relative flex gap-4 w-full ${index + 1 === stages.length ? "mb-0" : "mb-6"} `}
        >
            {/* RequestDetailsCard Left Column */}
            <div className="relative flex flex-col items-center">
                {/* Connector Line */}
                {index !== stages.length - 1 && (
                    <div
                        className={`absolute top-5 left-1/2 -translate-x-1/2 w-0.5 ${lineColor}`}
                        style={{
                            height: "calc(100% + 2rem)",
                            zIndex: 0,
                        }}
                    ></div>
                )}

                {/* Circle Icon */}
                <div className="relative flex items-center justify-center">
                    {isActive && (
                        <>
                            <span className="absolute w-10 h-10 rounded-full bg-yellow-400/40 animate-pulse-wave"></span>
                            <span className="absolute w-10 h-10 rounded-full bg-yellow-400/30 animate-pulse-wave delay-500"></span>
                        </>
                    )}
                    <div
                        className={`z-10 rounded-full p-2.5 shadow-md flex items-center justify-center ${getBgColor(
                            isActive ? "In Progress" : stage.status,
                        )}`}
                    >
                        {getIcon(isActive ? "In Progress" : stage.status)}
                    </div>
                </div>
            </div>
            {/* Stage Card */}
            <div className="flex-1 min-w-0">
                <div className="bg-white rounded-2xl border-t-4 border-x border-b border-x-border border-b-border shadow-sm border-t-primary px-4 py-4 transition-all overflow-hidden">
                    {/* Header: Stage Info & Status */}
                    <div className="flex justify-between items-start gap-3 mb-3">
                        <div className="flex flex-col gap-1">
                            <Typography
                                variant="mobileCardLabel"
                                className="block text-gray-500 uppercase tracking-wide"
                            >
                                Stage {index + 1}
                            </Typography>
                            <Typography variant="mobileCardTitle" className="break-words">
                                {stage.stage_name}
                            </Typography>
                        </div>
                        <div className="flex-shrink-0">
                            <StatusBadge status={stage.status} />
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gray-100 w-full mb-3" />

                    {/* Body: Details */}
                    <div className="space-y-2.5">
                        {/* Assign To  */}
                        <div className="flex items-start text-sm gap-2">
                            <Typography
                                variant="mobileCardLabel"
                                className="block text-gray-500 shrink-0 mt-0.5 whitespace-nowrap"
                            >
                                Assign To
                            </Typography>
                            <div className="flex-1 min-w-0 overflow-hidden flex justify-end">
                                <MobileAllocatedTo
                                    users={stage.allocated_to}
                                    roles={allocatedTo.roles}
                                    showLabel={false}
                                    RoleAssignedUsers={stage?.role_assigned_users}
                                />
                            </div>
                        </div>

                        <div className="flex justify-between items-start text-sm gap-4">
                            <Typography
                                variant="mobileCardLabel"
                                className="block text-gray-500 shrink-0 mt-0.5"
                            >
                                Action By
                            </Typography>
                            {stage.approval_time && actorDetails ? (
                                <WrapperHoverCard
                                    employeeId={actorDetails.employee}
                                    placement="bottom-left"
                                >
                                    <Typography
                                        variant="mobileCardValue"
                                        className="text-right flex-1 min-w-0 truncate mt-0.5 cursor-pointer text-primary-600 hover:underline"
                                    >
                                        {actorDetails.name}
                                    </Typography>
                                </WrapperHoverCard>
                            ) : (
                                <Typography
                                    variant="mobileCardValue"
                                    className="text-right flex-1 min-w-0 truncate mt-0.5"
                                >
                                    -
                                </Typography>
                            )}
                        </div>

                        <div className="flex justify-between items-start text-sm gap-4">
                            <Typography
                                variant="mobileCardLabel"
                                className="block text-gray-500 shrink-0 mt-0.5"
                            >
                                Trigger Date
                            </Typography>
                            <Typography
                                variant="mobileCardValue"
                                className="text-right flex-1 min-w-0 truncate mt-0.5"
                            >
                                {formatToIndianDate(stage?.todo?.creation) || "-"}
                            </Typography>
                        </div>
                        <div className="flex justify-between items-start text-sm gap-4">
                            <Typography
                                variant="mobileCardLabel"
                                className="block text-gray-500 shrink-0 mt-0.5"
                            >
                                Due Date
                            </Typography>
                            <Typography
                                variant="mobileCardValue"
                                className="text-right flex-1 min-w-0 truncate mt-0.5"
                            >
                                {formatToIndianDate(stage?.todo?.date) || "-"}
                            </Typography>
                        </div>
                        <div className="flex justify-between items-start text-sm gap-4">
                            <Typography
                                variant="mobileCardLabel"
                                className="block text-gray-500 shrink-0 mt-0.5"
                            >
                                Completed Date
                            </Typography>
                            <Typography
                                variant="mobileCardValue"
                                className="text-right flex-1 min-w-0 mt-0.5"
                            >
                                {formatToIndianDate(stage.completion_date || "") || "-"}
                            </Typography>
                        </div>
                    </div>
                </div>
                <div className="w-full flex flex-col gap-2">
                    <FlowStageActions
                        stage={stage}
                        stages={stages}
                        stageIndex={index}
                        initiatorForms={initiatorForms}
                        handleAction={handleAction}
                        variant="buttons"
                        canAct={canPerformActions}
                    />
                </div>
            </div>
        </div>
    );
};

export default FlowTableRow;
