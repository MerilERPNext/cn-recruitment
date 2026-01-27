/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useMemo, useState } from "react"
import ApprovalDetails from "./ApprovalDetails"
import ApprovalModal from "./ApprovalModel"
import CardTable from "../../../shared/CardTable"
import { FormIOComponent } from "../../../../types/formio"
import CardStages from "./StageCard"
import { TodoType } from "../../../../types/todos"
import { Typography } from "../../../shared/atoms/Typography"
import { format, parse } from "date-fns"
export interface ApprovalStage {
  approval_response_data: string;
  stage_name: string | null
  user: string | null
  role: string | null
  user_id: string | null;
  status: "Approved" | "Pending" | "Rejected";
  form_json?: {
    components: FormIOComponent[]
  }
}

interface ReferenceDocument {
  name: string
  employee_name: string
  designation: string
  department: string
  date_of_joining: string
  [key: string]: any
}

export interface ApprovalData {
  allocated_to: string;
  allocated_to_emp_id: string;
  todo_id: string
  reference_type: string
  reference_name: string
  description: string
  due_date: string
  todo_status: string
  role: string
  approval_stages_status: ApprovalStage[]
  reference_document: ReferenceDocument
  custom_doctype_actions: string;
}

interface ApprovalTrackerProps {
  data: TodoType,
  For: "Employee Separation" | "Employee Confirmation"
}

export default function ApprovalTracker({ data, For }: ApprovalTrackerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const actions: { name: string; hasForm: boolean }[] = useMemo(() => {
    const withForm: string[] = data?.custom_doctype_actions_with_form
      ? JSON.parse(data.custom_doctype_actions_with_form.replace(/'/g, '"'))
      : [];

    const withoutForm: string[] = data?.custom_doctype_actions
      ? JSON.parse(data.custom_doctype_actions.replace(/'/g, '"'))
      : [];

    const map = new Map<string, { name: string; hasForm: boolean }>();

    // First add actions without form
    withoutForm.forEach(action => {
      map.set(action, { name: action, hasForm: false });
    });

    // Then override with actions that have form
    withForm.forEach(action => {
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
      (stage) => stage.status === "Approved"
    ) ?? false

  const Rejected =
    data?.approval_stages_status?.some(
      (stage) => stage.status === "Rejected"
    ) ?? false;

  const pendingCount =
    data?.approval_stages_status?.filter((s) => s.status === "Pending").length ?? 0

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex flex-col gap-4">
          {/* Header Section */}
          <div className="flex justify-between">
            <div className="space-y-2">
              <Typography variant="h4">{data.reference_type}</Typography>
              <Typography variant="bodySmall" color="body2">{data.reference_name}</Typography>
              <Typography variant="bodySmall" color="body1">{data.description}</Typography>
            </div>
            <div className="flex ml-auto">
              <Typography variant="bodySmall" color="body2" className="mr-2">Due Date:</Typography>
              <Typography variant="bodySmall" color="body1">{formatDateToDDMMYYYY(data.due_date)}</Typography>
            </div>
          </div>
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {allStagesComplete ? (
              <>
                <div className="w-5 h-5 text-green-400">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <Typography variant="bodySmall" color="success">Completed all stages</Typography>
              </>
            ) : Rejected ? (
              <>
                <div className="w-5 h-5 text-red-500">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-sm font-medium text-red-600">Rejected</span>
              </>
            ) : (
              <>
                <div className="w-5 h-5 text-yellow-500">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-sm font-medium text-yellow-600">Pending - {pendingCount} approvals</span>
              </>
            )}
          </div>

          {/* Action Button or Details */}
          <div className="mt-4">
            {allStagesComplete && (
              <ApprovalDetails data={data} title={For} />
            )}
            <div className="w-full mt-8 lg:border-1 rounded-lg">
              <CardTable
                titles={[
                  "Stage",
                  "Assigned To",
                  "Status",
                  "Action"
                ]}
              >
                <div className="flex flex-col pt-1">
                  {data?.approval_stages_status.map((item, idx) => {
                    const isActive = item.status === "Pending" && (idx == 0 || data?.approval_stages_status[idx - 1].status != "Pending");
                    const isLastStage = idx == data?.approval_stages_status.length - 1;

                    return (
                      <CardStages
                        data={item as ApprovalStage}
                        assignedTo={{ user_id: data?.allocated_to, emp_id: data?.allocated_to_emp_id, role: data?.role }}
                        actions={actions}
                        isActive={isActive}
                        todoId={data.todo_id}
                        isLastStage={isLastStage} />
                    );
                  })}
                </div>
              </CardTable>
            </div>

          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && <ApprovalModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={data} />}
    </div>
  )
}


