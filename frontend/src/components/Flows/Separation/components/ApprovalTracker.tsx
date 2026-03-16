/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import ApprovalDetails from "./ApprovalDetails";
import ApprovalModal from "./ApprovalModel";
import { FormIOComponent } from "../../../../types/formio";
import CardStages from "./StageCard";
import { TodoType } from "../../../../types/todos";
import { Typography } from "../../../shared/atoms/Typography";
import { format, parse } from "date-fns";
import { Card } from "../../../shared/atoms/Card";
import { createPortal } from "react-dom";
import ReviewForm from "./ReviewForm";
import { Form } from "@tsed/react-formio";
import ViewFormButton from "../../ViewFormButton";
import StatusTimelineRow from "../../Confirmation/components/StatusTimelineRow";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
export interface ApprovalStage {
  approval_time: string;
  approval_response_data: string;
  stage_name: string | null;
  user: string | null;
  role: string | null;
  user_id: string | null;
  status: "Approved" | "Pending" | "Rejected";
  form_json?: {
    components: FormIOComponent[];
  };
}

interface ApprovalTrackerProps {
  data: TodoType;
  For: "Employee Separation";
}

export default function ApprovalTracker({ data, For }: ApprovalTrackerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSelfInitForm, setShowSelfInitForm] = useState<boolean>(false);
  const [formSchema, setFormSchema] = useState<any>();

  const selfInitFormAndAns = useMemo(
    () => {
      if (!data?.reference_document?.initiator_form) {
        return null;
      }
      try {
        return JSON.parse(data.reference_document.initiator_form);
      } catch (error) {
        console.error("Failed to parse initiator_form JSON:", error);
        return null;
      }
    },
    [data],
  );

  const handleShowForm = () => {
    const schema: FormIOComponent[] = selfInitFormAndAns?.form?.components;
    const answer = selfInitFormAndAns?.answer;

    setFormSchema((prev: any) => {
      if (!schema) return prev;

      const updatedSchema = schema
        .filter((comp) => comp.key !== "submit")
        .map((component) => {
          const key = component.key;

          if (key && answer[key] !== undefined) {
            return {
              ...component,
              defaultValue: answer[key],
            };
          }

          return component;
        });

      return {
        display: "form",
        components: updatedSchema,
      };
    });

    setShowSelfInitForm(true);
  };

  const actions: { name: string; hasForm: boolean }[] = useMemo(() => {
    const withForm: string[] = data?.custom_doctype_actions_with_form
      ? JSON.parse(data.custom_doctype_actions_with_form.replace(/'/g, '"'))
      : [];

    const withoutForm: string[] = data?.custom_doctype_actions
      ? JSON.parse(data.custom_doctype_actions.replace(/'/g, '"'))
      : [];

    const map = new Map<string, { name: string; hasForm: boolean }>();

    // First add actions without form
    withoutForm.forEach((action) => {
      map.set(action, { name: action, hasForm: false });
    });

    // Then override with actions that have form
    withForm.forEach((action) => {
      map.set(action, { name: action, hasForm: true });
    });

    return Array.from(map.values());
  }, [data]);

  const formatDateToDDMMYYYY = (dateStr: string) => {
    const parsedDate = parse(dateStr, "dd-MM-yyyy", new Date());
    return format(parsedDate, "dd/MM/yyyy");
  };

  if (!data) {
    return (
      <div className="bg-white rounded-2xl shadow p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-700">Approval Tracker</h3>
        <p className="text-sm text-gray-500">No approval data available.</p>
      </div>
    );
  }
  const allStagesComplete =
    data?.approval_stages_status?.every(
      (stage) => stage.status === "Approved",
    ) ?? false;

  const Rejected =
    data?.approval_stages_status?.some(
      (stage) => stage.status === "Rejected",
    ) ?? false;

  const pendingCount =
    data?.approval_stages_status?.filter((s) => s.status === "Pending")
      .length ?? 0;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg md:border shadow-sm md:p-6 p-4">
        <div className="  flex flex-col gap-4">
          {/* Header Section */}
          <div className="flex justify-between">
            {/* Status Badge */}
            <div className="flex items-baseline gap-2 flex-wrap">
              <Typography variant="bodySmall"> Overall Stauts :</Typography>
              <div className="flex items-center gap-2">
                {allStagesComplete ? (
                  <Typography variant="bodyMedium" color="success">
                    Completed
                  </Typography>
                ) : Rejected ? (
                  <Typography variant="bodyMedium" color="error">
                    Rejected
                  </Typography>
                ) : (
                  <Typography variant="bodyMedium" color="warning">
                    Pending - {pendingCount} approvals
                  </Typography>
                )}
              </div>
            </div>
            <div className="flex flex-wrap ml-auto">
              <Typography variant="bodySmall" color="body2" className="mr-2">
                Due Date:
              </Typography>
              <Typography variant="bodySmall" color="body1">
                {formatDateToDDMMYYYY(data.due_date)}
              </Typography>
            </div>
          </div>
          {allStagesComplete && (
            <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-5 h-5 text-green-600 flex-shrink-0">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>

              <Typography variant="bodySmall">
                <span className="font-medium text-green-800">
                  All Approvals Completed Succesfully
                </span>
              </Typography>
            </div>
          )}

          <ApprovalDetails
            isPending={!allStagesComplete || !Rejected}
            data={data}
            title={For}
          />
        </div>
      </div>
      <Card>
        <div className="w-full  rounded-lg">
          <Typography className="mb-2" variant="subheading">
            Separation Workflow Timeline
          </Typography>
          <div className="flex flex-col pt-1">
            {selfInitFormAndAns && (
              <div className="grid w-full lg:hover:bg-primary/20 cursor-pointer text-sm lg:px-6">
                <StatusTimelineRow
                  timelineData={{
                    isLast: false,
                    status: "completed",
                  }}
                >
                  <div className="grid lg:grid-cols-2 grid-cols-1 py-2">
                    <div className="ml-4 flex flex-col">
                      <Typography variant="bodyMedium">
                        Employee Self Form Submission
                      </Typography>
                      <Typography variant="bodySmall">
                        Self form details submitted
                      </Typography>
                    </div>

                    <div className="flex justify-between max-sm:flex-row-reverse items-start px-4 pt-1 pb-3">
                      <div className="flex gap-3">
                        <ViewFormButton onClick={handleShowForm} />
                      </div>
                      <div>
                        {formatToIndianDate(
                          data?.reference_document?.creation || "",
                        )}
                      </div>
                    </div>
                  </div>
                </StatusTimelineRow>
              </div>
            )}
            {data?.approval_stages_status.map((item, idx) => {
              const isActive =
                item.status === "Pending" &&
                (idx == 0 ||
                  data?.approval_stages_status[idx - 1].status != "Pending");
              const isLastStage =
                idx == data?.approval_stages_status.length - 1;

              return (
                <CardStages
                  key={item?.stage_name ?? "" + idx}
                  stage={item as ApprovalStage}
                  assignedTo={{
                    emp_id: data?.allocated_to_emp_id,
                    roles: data?.allocated_roles,
                  }}
                  actions={actions}
                  isActive={isActive}
                  todoId={data.todo_id}
                  isLastStage={isLastStage}
                />
              );
            })}
          </div>
        </div>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <ApprovalModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          data={data}
        />
      )}

      {formSchema &&
        showSelfInitForm &&
        createPortal(
          <ReviewForm onClose={() => setShowSelfInitForm(false)}>
            <Form
              form={formSchema}
              options={{
                readOnly: true,
                viewAsHtml: false,
              }}
              submit={false}
            />
          </ReviewForm>,
          document.body,
        )}
    </div>
  );
}
