import React, { useEffect, useMemo } from "react";
import { X, Eye, FileText, ChevronRight } from "lucide-react";
import { createPortal } from "react-dom";
import { FlowRequestItem, FlowRequestStage, Attachment } from "../../../../types/flows";
import { FormIOForm } from "../../../../utils/flowUtils";
import { FormIOComponent } from "../../../../types/formio";
import FormPreview from "../../../shared/molecules/FormPreview";
import AttachmentPreview from "./AttachmentPreview";
import TeamApprovalActionPill from "../../../shared/atoms/TeamApprovalActionPill";
import { Typography } from "../../../shared/atoms/Typography";
import { useQueryClient } from "@tanstack/react-query";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type JsonToFormData = {
  form?: { components?: FormIOComponent[] };
  submission_data?: Record<string, unknown>;
};

interface ActModalProps {
  /** The current stage the user is acting on */
  stage: FlowRequestStage;
  /** Index of the current stage */
  stageIndex: number;
  /** All approval stages */
  stages: FlowRequestStage[];
  /** Initiator forms from the flow request */
  initiatorForms?: FlowRequestItem["initiator_forms"];
  /** Available actions (parsed from todo) */
  actions: string[];
  /** Callback when an action is taken */
  onAction: (action: string) => void;
  /** Loading state for actions */
  loadingAction?: { id: string; action: string } | null;
  /** Record ID for loading state comparison */
  recordId: string;
  /** Close the modal */
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helper: parse a stage's form data                                  */
/* ------------------------------------------------------------------ */

function parseStageForms(stage: FlowRequestStage): {
  schema: FormIOForm | null;
  answer: Record<string, unknown>;
  attachments: Attachment[];
} {
  if (!stage?.approval_response_data || !stage?.form_json?.components) {
    return { schema: null, answer: {}, attachments: [] };
  }

  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(stage.approval_response_data);
  } catch {
    data = {};
  }

  return {
    schema: { display: "form", components: stage.form_json.components },
    answer: data,
    attachments: (data as { addAttachment?: Attachment[] })?.addAttachment || [],
  };
}

/* ------------------------------------------------------------------ */
/*  Helper: parse initiation form data                                 */
/* ------------------------------------------------------------------ */

function parseInitiationForm(initiatorForms?: FlowRequestItem["initiator_forms"]): {
  schema: FormIOForm | null;
  answer: Record<string, unknown>;
  attachments: Attachment[];
} {
  if (!initiatorForms || initiatorForms.length === 0) {
    return { schema: null, answer: {}, attachments: [] };
  }

  let formData: JsonToFormData;
  try {
    formData = JSON.parse(initiatorForms[0]?.form_data_display || "{}");
  } catch {
    return { schema: null, answer: {}, attachments: [] };
  }

  const schema = formData?.form?.components ?? [];
  const answer = formData?.submission_data ?? {};

  if (schema.length === 0) {
    return { schema: null, answer: {}, attachments: [] };
  }

  return {
    schema: { display: "form", components: schema },
    answer,
    attachments: (answer as { addAttachment?: Attachment[] })?.addAttachment || [],
  };
}

/* ------------------------------------------------------------------ */
/*  Section Divider                                                    */
/* ------------------------------------------------------------------ */

const SectionDivider: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}> = ({ icon, title, subtitle }) => (
  <div className="flex items-center gap-4 px-1 pb-4">
    <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary shrink-0 shadow-sm">
      {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement) : icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <Typography variant="h4" className="font-bold text-gray-900 tracking-tight">
          {title}
        </Typography>
      </div>
      {subtitle && (
        <Typography variant="bodySmall" className="text-gray-500 text-sm mt-0.5">
          {subtitle}
        </Typography>
      )}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  ActModal Component                                                 */
/* ------------------------------------------------------------------ */

const ActModal: React.FC<ActModalProps> = ({
  stage,
  stageIndex,
  stages,
  initiatorForms,
  actions,
  onAction,
  loadingAction,
  recordId,
  onClose,
}) => {
  /* ---------- Parsed initiation form ---------- */
  const initForm = useMemo(() => parseInitiationForm(initiatorForms), [initiatorForms]);

  /* ---------- Previous stages with form data ---------- */
  const previousStagesWithForms = useMemo(() => {
    const result: { stage: FlowRequestStage; index: number; parsed: ReturnType<typeof parseStageForms> }[] = [];
    for (let i = 0; i < stageIndex; i++) {
      const s = stages[i];
      const parsed = parseStageForms(s);
      if (parsed.schema) {
        result.push({ stage: s, index: i, parsed });
      }
    }
    return result;
  }, [stages, stageIndex]);

  const hasContent = initForm.schema !== null || previousStagesWithForms.length > 0;

  const queryClient = useQueryClient();
  useEffect(() => {
    document.addEventListener("chatnext:modal:chat:close", onClose);

    return () => {
      document.removeEventListener(
        "chatnext:modal:chat:close",
        onClose,
      );
    };
  }, [queryClient, onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      style={{ animation: "actModalFadeIn 200ms ease-out" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Inline keyframes */}
      <style>{`
        @keyframes actModalFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes actModalSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Modal Container */}
      <div
        className="w-full h-full md:h-auto md:max-w-2xl md:max-h-[85vh] md:rounded-xl bg-white flex flex-col overflow-hidden relative shadow-2xl"
        style={{ animation: "actModalSlideUp 250ms ease-out" }}
      >
        {/* ============ Header ============ */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-primary/10 to-transparent sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/15 text-primary">
              <FileText size={18} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 font-brand">Review & Act</h2>
              <p className="text-xs text-gray-500 font-brand mt-0.5 flex items-center gap-1">
                {stage.stage_name}
                <ChevronRight size={12} className="text-gray-400" />
                <span className="text-primary font-medium">Take Action</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* ============ Content ============ */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-6 pb-28 md:pb-8 bg-gray-50/50">
          {!hasContent && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <FileText size={40} strokeWidth={1.5} className="mb-3 text-gray-300" />
              <Typography variant="bodySmall" className="text-gray-500 font-medium">
                No previous form data available
              </Typography>
              <Typography variant="bodySmall" className="text-gray-400 text-xs mt-1">
                You can proceed with your action below
              </Typography>
            </div>
          )}

          {/* ---------- Initiation Form ---------- */}
          {initForm.schema && (
            <div className="mb-8 p-6 border border-border rounded-2xl bg-white shadow-sm">
              <SectionDivider
                icon={<Eye strokeWidth={2.5} size={22} />}
                title="Initiation Form"
                subtitle="Submitted by the initiator"
              />
              <div className="border border-border rounded-xl p-4 bg-gray-50/30">
                <FormPreview
                  containerId={`act-modal-initiation-form`}
                  schema={initForm.schema}
                  submissionData={initForm.answer}
                  readOnly={true}
                />
                <AttachmentPreview attachments={initForm.attachments} />
              </div>
            </div>
          )}

          {/* ---------- Previous Stages ---------- */}
          {previousStagesWithForms.map(({ stage: prevStage, index: idx, parsed }) => (
            <div key={`prev-stage-${idx}`} className="mb-8 p-6 border border-border rounded-2xl bg-white shadow-sm">
              <SectionDivider
                icon={<FileText strokeWidth={2.5} size={22} />}
                title={`Stage ${idx + 1}: ${prevStage.stage_name}`}
                subtitle={prevStage.user ? `Acted by ${prevStage.user}` : undefined}
              />
              <div className="border border-border rounded-xl p-4 bg-gray-50/30">
                <FormPreview
                  containerId={`act-modal-stage-${idx}-form`}
                  schema={parsed.schema!}
                  submissionData={parsed.answer}
                  readOnly={true}
                />
                <AttachmentPreview attachments={parsed.attachments} />
              </div>
            </div>
          ))}
        </div>

        {/* ============ Sticky Footer — Action Buttons ============ */}
        <div className="sticky bottom-0 px-5 py-4 border-t border-border bg-white/95 backdrop-blur-sm z-20">
          <TeamApprovalActionPill
            actions={actions}
            status={stage?.todo?.status ?? stage?.status}
            recordId={recordId}
            loadingAction={loadingAction}
            onAction={onAction}
            variant="modal"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ActModal;
