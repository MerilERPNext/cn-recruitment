/* eslint-disable @typescript-eslint/no-explicit-any */
import { RequestDetailCard } from "./RequestDetailsTimeline";
import CardTable from "../../shared/CardTable";
import { useScreenSize } from "../../../hooks/useScreenSize";

import StatusBadge from "../../shared/atoms/statusBadge";
import { Typography } from "../../shared/atoms/Typography";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import TeamApprovalActionPill from "../../shared/atoms/TeamApprovalActionPill";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCallback, useMemo, useState } from "react";
import { useApprovalAction } from "../../../hooks/userApprovalList";
import { Attachment, FlowRequestItem, FlowRequestStage } from "../../../types/flows";

import { StaticListView } from "../../ListView";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import { buildFormFromSchemaAndAnswer, extractRolesAndUsers, FormIOForm } from "../../../utils/flowUtils";
import AllocatedToTooltip from "../../shared/AllocatedToTooltip";
import { useQueryClient } from "@tanstack/react-query";
import { Form } from "@tsed/react-formio";
import ReviewForm from "../Separation/components/ReviewForm";
import { createPortal } from "react-dom";
import Button from "../../shared/atoms/Button";
import AttachmentPreview from "./AttachmentPreview";

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
    <div className="sm:px-7 px-4 max-sm:pb-8">
      <CardTable titles={titles}>
        <StaticListView
          data={data.approval_stages}
          ItemComponent={(index, item) =>
            isDesktop ? (
              <StageCard stage={item} isActive={index === activeStageIndex} />
            ) : (
              <RequestDetailCard
                stage={item}
                index={index}
                stages={data?.approval_stages}
                isActive={index === activeStageIndex}
              />
            )
          }
          getItemKey={(stage, index) => stage?.stage_name + index}
          pageSize={20}
          SkeletonComponent={CardSkeleton}
          loadMorePagination={true}
        />
      </CardTable>
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


  const [formSchema, setFormSchema] = useState<FormIOForm | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [responseData, setResponseData] = useState<{ addAttachment?: Attachment[] } | null>(null);

  const handleShowForm = () => {
    if (!stage?.form_json?.components) return;

    const schema = stage.form_json.components;

    let data: Record<string, unknown> = {};

    try {
      data = stage?.approval_response_data
        ? JSON.parse(stage.approval_response_data)
        : {};
    } catch (error) {

      console.error("Invalid approval_response_data JSON:", error);
      data = {};
    }
    console.log({ data })
    setFormSchema(buildFormFromSchemaAndAnswer(schema, data));
    setResponseData(data);
    setShowForm(true);
  };

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

        <AllocatedToTooltip
          position="right"
          users={stage.allocated_to}
          roles={allocatedTo.roles}
          role={stage.role || ""}
        >
          <StatusBadge status={stage.status || "-"} />
        </AllocatedToTooltip>

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

        <>
          {stage?.approval_response_data && (
            <Button
              variant="outline"
              onClick={handleShowForm}
            >
              Review Form
            </Button>
          )}
          {canPerformActions && (
            <TeamApprovalActionPill
              actions={actions}
              status={stage?.status}
              recordId={stage?.todo?.name}
              // loadingAction={loadingAction}
              onAction={(action) => onAction(action, stage?.todo)}
            />
          )}
        </>
      </div>
      {formSchema && showForm && createPortal(
        <ReviewForm onClose={() => setShowForm(false)}>
          <Form
            form={formSchema}
            options={{
              readOnly: true, // This makes the entire form read-only
              viewAsHtml: false, // Set to true to render as plain HTML instead of form inputs
            }}
            submit={false}
          />
          <AttachmentPreview attachments={responseData?.addAttachment || []} />
        </ReviewForm>,
        document.body,
      )}
    </div>
  );
};

export default FlowTable;
