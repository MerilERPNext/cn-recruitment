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
import { FlowRequestItem, FlowRequestDetailItem } from "../../../../types/flows";
import { FormIOForm } from "../../../../utils/flowUtils";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import FormPreview from "../../../shared/molecules/FormPreview";
import NoDataFound from "../../../shared/atoms/NoDataFound";
import RevokeDetailsSection from "../../FlowRequests/FlowDetails/RevokeDetailsSection";

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
  data?: FlowRequestItem | FlowRequestDetailItem | null;
  For: "Employee Separation" | "Employee Termination";
  isLoading?: boolean;
}

export default function ApprovalTracker({ data, For, isLoading }: ApprovalTrackerProps) {
  const [showSelfForm, setShowSelfForm] = useState(false);
  const [formSchema, setFormSchema] = useState<FormIOForm | null>(null);
  const [formAnswer, setFormAnswer] = useState<Record<string, any>>({});
  const [showRevokeForm, setShowRevokeForm] = useState(false);
  const [revokeFormSchema, setRevokeFormSchema] = useState<FormIOForm | null>(null);
  const [revokeFormAnswer, setRevokeFormAnswer] = useState<Record<string, any>>({});

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-sm border border-gray-100 min-h-[250px]">
        <NoDataFound loading={true} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-sm border border-gray-100 min-h-[250px]">
        <NoDataFound
          title="No Approval Data Available"
          subtitle="There are no approval details to track at the moment."
        />
      </div>
    );
  }

  const haveInitiatorForm = Boolean(data?.initiator_forms && data.initiator_forms.length > 0);
  const haveRevokeForm = Boolean(data?.revoke?.revoke_forms && data.revoke.revoke_forms.length > 0);

  const handleShowSelfForm = () => {
    let displayData: Record<string, any> = {};
    let rawData: Record<string, any> = {};
    try {
      displayData = JSON.parse(data?.initiator_forms?.[0]?.form_data_display || "{}");
      rawData = JSON.parse(data?.initiator_forms?.[0]?.form_data || "{}");
    } catch (error) {
      console.error("Invalid initiator_forms JSON:", error);
      return;
    }
    const rawSchema = displayData?.form?.components ?? rawData?.form?.components ?? [];
    const schema = rawSchema.filter(
      (comp: any) => !(comp.type === "button" && comp.action === "submit")
    );
    const answer = displayData?.submission_data ?? rawData?.submission_data ?? {};

    if (schema.length === 0 && Object.keys(answer).length === 0) return;
    setFormSchema({ display: "form", components: schema });
    setFormAnswer(answer || {});
    setShowSelfForm(true);
  };

  const handleShowRevokeForm = () => {
    if (!data?.revoke?.revoke_forms?.[0]) return;
    const formObj = data.revoke.revoke_forms[0];
    let displayData: Record<string, any> = {};
    let rawData: Record<string, any> = {};
    try {
      displayData = JSON.parse(formObj.form_data_display || "{}");
      rawData = JSON.parse(formObj.form_data || "{}");
    } catch (error) {
      console.error("Invalid revoke_forms JSON:", error);
      return;
    }
    const rawSchema = displayData?.form?.components ?? rawData?.form?.components ?? [];
    const schema = rawSchema.filter(
      (comp: any) => !(comp.type === "button" && comp.action === "submit")
    );
    const answer = displayData?.submission_data ?? rawData?.submission_data ?? {};

    if (schema.length === 0 && Object.keys(answer).length === 0) return;
    setRevokeFormSchema({ display: "form", components: schema });
    setRevokeFormAnswer(answer || {});
    setShowRevokeForm(true);
  };

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
            data={data}
          />
        </div>
      </div>
      <Card>
        <div className="w-full  rounded-lg">
          <Typography className="mb-2" variant="subheading">
            {For === "Employee Separation" ? "Separation Approval Timeline" : "Termination Workflow Timeline"}
          </Typography>
          <div className="flex flex-col pt-1">
            {haveInitiatorForm && (
              <div className="grid w-full lg:hover:bg-primary/20 cursor-pointer text-sm lg:px-6">
                <StatusTimelineRow
                  timelineData={{
                    isLast: data?.approval_stages.length === 0 ? true : false,
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

                    <div className="flex justify-between max-sm:flex-col gap-3 items-start px-4 pt-1 pb-3">
                      <div className="flex gap-3">
                        <ViewFormButton variant="contain" size="sm" onClick={handleShowSelfForm} />
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
                (idx === 0 ||
                  data?.approval_stages[idx - 1].status === "Approved");
              const isLastStage =
                idx === data?.approval_stages.length - 1;

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


      {data?.revoke && (
        <RevokeDetailsSection
          revoke={data.revoke}
          haveRevokeForm={haveRevokeForm}
          onViewRevokeForm={handleShowRevokeForm}
        />
      )}

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

      {revokeFormSchema &&
        showRevokeForm &&
        createPortal(
          <ReviewForm
            onClose={() => setShowRevokeForm(false)}
            title="Revocation Form"
          >
            <FormPreview
              containerId="separation-revoke-form-preview"
              schema={revokeFormSchema}
              submissionData={revokeFormAnswer}
              readOnly={true}
            />
          </ReviewForm>,
          document.body,
        )}
    </div>
  );
}
