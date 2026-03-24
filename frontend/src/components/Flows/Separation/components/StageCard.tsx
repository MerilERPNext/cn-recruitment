/* eslint-disable @typescript-eslint/no-explicit-any */
import { createPortal } from "react-dom";
import { Form } from "@tsed/react-formio";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import { useApprovalAction } from "../../../../hooks/userApprovalList";
import { FormIOComponent, FormIOSchema } from "../../../../types/formio";
import { useCallback, useMemo, useState } from "react";
import { Typography } from "../../../shared/atoms/Typography";
import Button from "../../../shared/atoms/Button";
import ReviewForm from "./ReviewForm";
import StatusTimelineRow from "../../Confirmation/components/StatusTimelineRow";
import AttachmentPreview from "../../RequestDetails/AttachmentPreview";
import { queryClient } from "../../../../providers/QueryProvider";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import ViewFormButton from "../../ViewFormButton";
import { Attachment, FlowRequestStage } from "../../../../types/flows";
import { extractRolesAndUsers } from "../../../../utils/flowUtils";


interface CardStagesProps {
  stage: FlowRequestStage;
  isActive: boolean;
  isLastStage: boolean;
}

const CardStages = ({
  stage,
  isActive,
  isLastStage,
}: CardStagesProps) => {
  const [formSchema, setFormSchema] = useState<FormIOSchema | null>(null);
  const [show, setShow] = useState(false);
  const [responseData, setResponseData] = useState<{ addAttachment?: Attachment[] } | null>(null);

  const handleShowForm = (
    schema: FormIOComponent[] | undefined,
    approval_response_data: string,
    parsedData?: Record<string, unknown>
  ) => {
    let data: Record<string, unknown> = parsedData || {};


    if (!data) {
      try {
        data = JSON.parse(approval_response_data);
      } catch (error) {
        console.error("Invalid approval_response_data JSON:", error);
        data = {};
      }
    }

    setFormSchema((prev) => {
      if (!schema) return prev;

      const updatedSchema = schema.map((component) => {
        const key = component.key;

        if (key && data[key] !== undefined) {
          return {
            ...component,
            defaultValue: data[key],
          };
        }

        return component;
      });

      return {
        display: "form",
        components: updatedSchema,
      };
    });
    setShow(true);
  };

  const handleShowFormWithResponse = (
    schema: FormIOComponent[] | undefined,
    approval_response_data: string,
  ) => {
    let data = null;
    try {
      data = JSON.parse(approval_response_data);
    } catch (error) {
      console.error("Invalid approval_response_data JSON:", error);
    }
    setResponseData(data);
    handleShowForm(schema, approval_response_data, data);
  };


  const { data: currentUser } = useCurrentUser();

  const actions = stage?.todo?.custom_doctype_actions
    ? JSON.parse(stage?.todo?.custom_doctype_actions)
    : [];
  const actionsWithForm = stage?.todo?.custom_doctype_actions_with_form
    ? JSON.parse(
      stage?.todo?.custom_doctype_actions_with_form.replace(/'/g, '"'),
    )
    : [];

  const triggerRefetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["separation"] });
    queryClient.invalidateQueries({ queryKey: ["separation-workflow"] });
  }, []);

  const { handleAction } = useApprovalAction(triggerRefetch);

  const onAction = (action: string, data: any) => {
    handleAction(action, {
      todo_id: data.name,
      custom_approval_type: data.custom_approval_type,
      custom_open_chatnext_assistant_on_action:
        actionsWithForm.includes(action),
    });
  };


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


  const mapStatusTimeline = (status: string) => {
    if (isActive) return "action_required";
    switch (status) {
      case "Approved":
        return "completed";

      case "Pending":
        return "pending";

      case "Action Required":
        return "action_required";

      case "Rejected":
        return "rejected";
      default:
        return "default";
    }
  };

  const approverPerfix =
    stage?.status == "Pending"
      ? "Process yet to be trigger for"
      : stage?.status == "Approved"
        ? "Approved by "
        : stage?.status == "Rejected"
          ? "Rejected by"
          : "Pending inputs from ";

  return (
    <div className="grid w-full lg:hover:bg-primary/20 cursor-pointer  items-center text-sm  lg:px-6">
      <StatusTimelineRow
        timelineData={{
          isLast: isLastStage,
          status: mapStatusTimeline(stage?.status),
        }}
      >
        <div className="grid lg:grid-cols-2 grid-cols-1 py-2">
          <div className="ml-4 flex flex-col">
            <Typography variant="bodyMedium">{stage?.stage_name}</Typography>
            <Typography variant="bodySmall">
              {approverPerfix} {stage?.role || stage?.user}
            </Typography>
          </div>

          <div className="flex justify-between max-sm:flex-row-reverse items-start px-4 pt-1 pb-3">
            <div className="flex gap-3">
              {stage?.approval_response_data && stage?.status != "Pending" && (
                <ViewFormButton
                  onClick={() =>
                    handleShowFormWithResponse(
                      stage?.form_json?.components,
                      stage?.approval_response_data,
                    )
                  }
                />
              )}
              {canPerformActions &&
                actions.map((action: any) => (
                  <Button
                    onClick={() => onAction(action, stage?.todo)}
                  >
                    {action}
                  </Button>
                ))}
            </div>
            <div>
              {status == "action_required"
                ? "In Progress"
                : formatToIndianDate(stage?.approval_time || "")}
            </div>
          </div>
        </div>
      </StatusTimelineRow>

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
    </div>
  );
};

export default CardStages;
