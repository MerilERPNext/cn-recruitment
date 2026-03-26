import React, { useMemo, useState } from "react";
import { Attachment } from "../../../types/flows";

import { FormIOComponent } from "../../../types/formio";
import ReviewForm from "../Separation/components/ReviewForm";
import { createPortal } from "react-dom";
import { Form } from "@tsed/react-formio";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import StatusTimelineItem from "./components/StatusTimelineItem";
import { ApprovalStage } from "../../../types/todos";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import useCurrentUser from "../../../hooks/useCurrentUser";
import ViewFormButton from "../ViewFormButton";
import { buildFormFromSchemaAndAnswer, FormIOForm } from "../../../utils/flowUtils";
import AttachmentPreview from "../RequestDetails/AttachmentPreview";

type handleActPropsType = {
  name: string;
  hasForm: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  todo: any;
};

interface StageCardProps {
  stages: ApprovalStage[];
  idx: number;
  showActButton?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any;
  handleAct: (handleActPropsType: handleActPropsType) => void;
}

const StageCard: React.FC<StageCardProps> = ({
  stages,
  idx,
  showActButton = false,
  item,
  handleAct,
}) => {
  const stage = stages[idx];
  const { data: currentUser } = useCurrentUser();
  const getStageStatus = (stage: { status: string }, idx: number) => {
    const isPending = stage?.status === "Pending";
    const prevIsPending = stages[idx - 1]?.status === "Pending";

    if (isPending && !prevIsPending) {
      return "action_required";
    }

    if (isPending) {
      return "pending";
    }

    return "completed";
  };
  const status = getStageStatus(stage, idx);

  const canPerformAction = useMemo(() => {
    if (!showActButton) return false;
    let actionPermission = false;

    if (!item?.custom_doctype_actions) return false;
    if (stage?.user_id && currentUser?.name)
      actionPermission = stage.user_id === currentUser.name;

    if (currentUser?.roles && stage?.role)
      actionPermission ||= currentUser.roles.some(
        (role) => role.role === stage.role,
      );

    return actionPermission;
  }, [stage, currentUser, item, showActButton]);

  const [formSchema, setFormSchema] = useState<FormIOForm | null>(null);
  const [show, setShow] = useState(false);
  const [responseData, setResponseData] = useState<{ addAttachment?: Attachment[] } | null>(null);

  const handleShowForm = (
    schema: FormIOComponent[] | undefined,
    approval_response_data: string,
    parsedData?: Record<string, unknown>
  ) => {
    if (!schema) return;

    let data: Record<string, unknown> = parsedData || {};


    if (!data) {
      try {
        data = JSON.parse(approval_response_data);
      } catch (error) {
        console.error("Invalid approval_response_data JSON:", error);
        data = {};
      }
    }

    setFormSchema(buildFormFromSchemaAndAnswer(schema, data));
    setShow(true);
  };

  const handleShowFormWithResponse = (
    schema: FormIOComponent[] | undefined,
    approval_response_data: string
  ) => {
    let data = null;
    try {
      data = JSON.parse(approval_response_data);
    } catch (error) {
      console.error("Invalid approval_response_data JSON:", error);
    }
    setResponseData(data);
    handleShowForm(schema, approval_response_data, data);
  }


  const approverPerfix =
    status == "pending"
      ? "Process yet to be trigger for"
      : status == "completed"
        ? "Approved by "
        : "Pending input from ";


  return (
    <>
      <StatusTimelineItem isLast={idx === stages.length - 1} status={status} />

      <div className="grid lg:grid-cols-2 grid-cols-1 py-2">
        <div className="ml-4 flex flex-col">
          <Typography variant="bodyMedium">{stage?.stage_name}</Typography>
          <Typography variant="bodySmall">
            {approverPerfix} {stage?.role || stage?.user}
          </Typography>
        </div>

        <div className="flex max-lg:flex-row-reverse justify-between items-center px-4 pt-1 pb-3">
          {stage?.approval_response_data && stage?.status != "pending" && (
            <ViewFormButton
              onClick={() =>
                handleShowFormWithResponse(
                  stage?.form_json?.components,
                  stage?.approval_response_data,
                )
              }
            />
          )}
          {canPerformAction && status == "action_required" ? (
            <Button
              variant="contain"
              size="md"
              onClick={() =>
                handleAct({ name: "Act", hasForm: true, todo: item })
              }
            >
              Act
            </Button>
          ) : (
            <div></div>
          )}

          <div>
            {status == "action_required"
              ? "In Progress"
              : formatToIndianDate(stage?.approval_time)}
          </div>
        </div>

        {/* <div>{stage?.user_id}</div> */}
      </div>
      {formSchema &&
        show &&
        createPortal(
          <ReviewForm onClose={() => setShow(false)}>
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
    </>
  );
};

export default StageCard;
