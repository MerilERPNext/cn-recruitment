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

interface ReferenceDocument {
  name: string;
  employee_name: string;
  designation: string;
  department: string;
  date_of_joining: string;
  [key: string]: any;
}

export interface ApprovalData {
  allocated_to: string;
  allocated_to_emp_id: string;
  todo_id: string;
  reference_type: string;
  reference_name: string;
  description: string;
  due_date: string;
  todo_status: string;
  role: string;
  approval_stages_status: ApprovalStage[];
  reference_document: ReferenceDocument;
  custom_doctype_actions: string;
}

interface ApprovalTrackerProps {
  data: TodoType;
  For: "Employee Separation";
}

export default function ApprovalTracker({ data, For }: ApprovalTrackerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
            {data?.approval_stages_status.map((item, idx) => {
              const isActive =
                item.status === "Pending" &&
                (idx == 0 ||
                  data?.approval_stages_status[idx - 1].status != "Pending");
              const isLastStage =
                idx == data?.approval_stages_status.length - 1;

              return (
                <CardStages
                  data={item as ApprovalStage}
                  assignedTo={{
                    user_id: data?.allocated_to,
                    emp_id: data?.allocated_to_emp_id,
                    role: data?.role,
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
    </div>
  );
}
