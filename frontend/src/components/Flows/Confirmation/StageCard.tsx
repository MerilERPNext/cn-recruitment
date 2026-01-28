import React, { useState } from "react";
import { FormIOComponent } from "../../../types/formio";
import ReivewForm from "./Component/ReivewForm";
import { createPortal } from "react-dom";
import { Form } from "@tsed/react-formio";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import StatusTimelineItem from "./components/StatusTimelineItem";
import { ApprovalStage } from "../../../types/todos";
import { Eye } from "lucide-react";
import formatToIndianDate from "../../../utils/formatToIndianDate";

type handleActPropsType = {
  name: string;
  hasForm: boolean;
  todo: any;
};

interface StageCardProps {
  stages: ApprovalStage[];
  idx: number;
  canPerformAction: boolean;
  item: any;
  handleAct: (handleActPropsType: handleActPropsType) => void;
}

const StageCard: React.FC<StageCardProps> = ({
  stages,
  idx,
  canPerformAction,
  item,
  handleAct,
}) => {
  const stage = stages[idx];
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

  const [formSchema, setFormSchema] = useState(null);
  const [show, setShow] = useState(false);
  const handleShowForm = (
    schema: FormIOComponent[] | undefined,
    approval_response_data: string,
  ) => {
    const data = JSON.parse(approval_response_data);

    setFormSchema((prev: any) => {
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

  const approverPerfix =
    status == "pending"
      ? "Process yet to be trigger for"
      : status == "completed"
        ? "Approved by "
        : "Pending inputs from ";

  return (
    <>
      <StatusTimelineItem isLast={idx === stages.length - 1} status={status} />

      <div className="grid lg:grid-cols-2 grid-cols-1 py-2">
        <div className="ml-4 flex flex-col">
          <Typography variant="subheading">{stage?.stage_name}</Typography>
          <Typography variant="bodySmall">
            {approverPerfix} {stage?.role || stage?.user}
          </Typography>

          {stage?.approval_response_data && stage?.status != "pending" && (
            <Button
              variant="subtle"
              size="md"
              onClick={() =>
                handleShowForm(
                  stage?.form_json?.components,
                  stage?.approval_response_data,
                )
              }
            >
              <Eye className="w-4 h-4" />
              View Form
            </Button>
          )}
        </div>

        <div className="flex justify-between items-start px-4 pt-1 pb-3">
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

        <div>{stage?.user_id}</div>
      </div>
      {formSchema &&
        show &&
        createPortal(
          <ReivewForm onClose={() => setShow(false)}>
            <Form
              form={formSchema}
              options={{
                readOnly: true, // This makes the entire form read-only
                viewAsHtml: false, // Set to true to render as plain HTML instead of form inputs
              }}
              submit={false}
            />
          </ReivewForm>,
          document.body,
        )}
    </>
  );
};

export default StageCard;
