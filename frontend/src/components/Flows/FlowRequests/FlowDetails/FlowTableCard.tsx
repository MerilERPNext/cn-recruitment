/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { Check, Clock, X, User } from "lucide-react";
import StatusBadge from "../../../shared/atoms/statusBadge";
import { Attachment, FlowRequestItem, FlowRequestStage } from "../../../../types/flows";

import formatToIndianDate from "../../../../utils/formatToIndianDate";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import { extractRolesAndUsers, FormIOForm } from "../../../../utils/flowUtils";
import { Typography } from "../../../shared/atoms/Typography";
import Button from "../../../shared/atoms/Button";
import { createPortal } from "react-dom";
import ReviewForm from "../../Separation/components/ReviewForm";
import AttachmentPreview from "./AttachmentPreview";
import MobileAllocatedTo from "../../../shared/MobileAllocatedTo";
import FormPreview from "../../../shared/molecules/FormPreview";
import ActModal from "./ActModal";
import { handleActionType } from "../../../../hooks/userApprovalList";

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

    const actions = stage?.todo?.custom_doctype_actions
        ? JSON.parse(stage?.todo?.custom_doctype_actions)
        : [];
    const actionsWithForm = stage?.todo?.custom_doctype_actions_with_form
        ? JSON.parse(
            stage?.todo?.custom_doctype_actions_with_form.replace(/'/g, '"'),
        )
        : [];

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

    const [showActModal, setShowActModal] = useState(false);

    const lineColor =
        isCompleted &&
            nextStage?.status !== "Failed" &&
            nextStage?.status !== "Rejected"
            ? "bg-green-500"
            : "bg-gray-300";

    const [formSchema, setFormSchema] = useState<FormIOForm | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [responseData, setResponseData] = useState<{ addAttachment?: Attachment[] } | null>(null);
    const [formAnswer, setFormAnswer] = useState<Record<string, unknown>>({});

    const handleShowForm = () => {
        const schema = stage?.form_json?.components;
        let data: Record<string, unknown> = {};
        try {
            data = JSON.parse(stage?.approval_response_data_display || stage?.approval_response_data || "{}");
        } catch (error) {
            console.error("Invalid approval_response_data JSON:", error);
        }
        if (!schema) return;
        setFormSchema({ display: "form", components: schema });
        setFormAnswer(data);
        setResponseData(data);
        setShowForm(true);
    }



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
                <div className="bg-white rounded-2xl border-t-4 border-x-1 border-b-1 border-x-primary/20 border-b-primary/20 shadow-sm border-primary px-4 py-4 transition-all overflow-hidden">
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
                                    role={stage.role || ""}
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
                            <Typography
                                variant="mobileCardValue"
                                className="text-right flex-1 min-w-0 truncate mt-0.5"
                            >
                                {stage.approval_time ? stage.user || "-" : "-"}
                            </Typography>
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
                {(stage?.approval_response_data_display || stage?.approval_response_data) && (
                    <Button
                        onClick={handleShowForm}
                        className="mt-2 w-full"
                        variant="outline"
                    >
                        Review Form
                    </Button>
                )}
                {canPerformActions && (
                    <div className="flex flex-wrap gap-2 mt-3 w-full">
                        <Button
                            variant="contain"
                            bgColor="primary"
                            size="md"
                            fullWidth
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowActModal(true);
                            }}
                        >
                            Act
                        </Button>
                    </div>
                )}
            </div>
            {formSchema && showForm && createPortal(
                <ReviewForm onClose={() => setShowForm(false)}>
                    <FormPreview
                        containerId={`request-detail-${stage.stage_name}-form-preview`}
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
                    stageIndex={index}
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
