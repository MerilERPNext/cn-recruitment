/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import ApprovalDetails from "./ApprovalDetails";
import { FormIOComponent } from "../../../../types/formio";
import CardStages from "./StageCard";
import { Typography } from "../../../shared/atoms/Typography";
import { Card } from "../../../shared/atoms/Card";
import { createPortal } from "react-dom";
import ReviewForm from "./ReviewForm";
import ViewFormButton from "../../ViewFormButton";
import StatusTimelineRow from "../../Confirmation/components/StatusTimelineRow";
import { FlowRequestItem } from "../../../../types/flows";
import { FormIOForm } from "../../../../utils/flowUtils";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import FormPreview from "../../../shared/molecules/FormPreview";
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
  data: FlowRequestItem;
  For: "Employee Separation" | "Employee Termination";
}

export default function ApprovalTracker({ data, For }: ApprovalTrackerProps) {

  const [showSelfForm, setShowSelfForm] = useState(false);
  const [formSchema, setFormSchema] = useState<FormIOForm | null>(null);
  const [formAnswer, setFormAnswer] = useState<Record<string, any>>({});

  const haveInitiatorForm = data?.initiator_forms && data.initiator_forms.length > 0;

  const handleShowSelfForm = () => {
    let formData: Record<string, any> = {};
    try {
      formData = JSON.parse(data?.initiator_forms?.[0]?.form_data);
    } catch (error) {
      console.error("Invalid initiator_forms form_data JSON:", error);
      return;
    }
    const schema = (formData as any)?.form?.components;
    const answer = (formData as any)?.submission_data;

    if (!schema) return;
    setFormSchema({ display: "form", components: schema });
    setFormAnswer(answer || {});
    setShowSelfForm(true);
  }


  if (!data) {
    return (
      <div className="bg-white rounded-2xl shadow p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-700">Approval Tracker</h3>
        <p className="text-sm text-gray-500">No approval data available.</p>
      </div>
    );
  }

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
                {data?.approval_status}
              </div>
            </div>
          </div>
          {data?.approval_status === "Completed" && (
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
            title={For}
          />
        </div>
      </div>
      <Card>
        <div className="w-full  rounded-lg">
          <Typography className="mb-2" variant="subheading">
            {For == "Employee Separation" ? "Separation Workflow Timeline" : "Termination Workflow Timeline"}
          </Typography>
          <div className="flex flex-col pt-1">
            {haveInitiatorForm && (
              <div className="grid w-full lg:hover:bg-primary/20 cursor-pointer text-sm lg:px-6">
                <StatusTimelineRow
                  timelineData={{
                    isLast: data?.approval_stages.length == 0 ? true : false,
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
                        <ViewFormButton onClick={handleShowSelfForm} />
                      </div>
                      <div>
                        {formatToIndianDate(data?.initiated_on)}
                      </div>
                    </div>
                  </div>
                </StatusTimelineRow>
              </div>
            )}
            {data?.approval_stages.map((item, idx) => {
              const isActive =
                item.status === "Pending" &&
                (idx == 0 ||
                  data?.approval_stages[idx - 1].status === "Approved");
              const isLastStage =
                idx == data?.approval_stages.length - 1;

              return (
                <CardStages
                  key={item?.stage_name ?? "" + idx}
                  stage={item}
                  isActive={isActive}
                  isLastStage={isLastStage}
                />
              );
            })}
          </div>
        </div>
      </Card>


      {formSchema &&
        showSelfForm &&
        createPortal(
          <ReviewForm
            onClose={() => setShowSelfForm(false)}
            title="Initiation Form"
          >
            <FormPreview
              containerId="separation-initiation-form-preview"
              schema={formSchema}
              submissionData={formAnswer}
              readOnly={true}
            />
          </ReviewForm>,
          document.body,
        )}
    </div>
  );
}
