import { useState } from "react";
import type { ReactNode, ReactElement } from "react";
import Button from "../shared/atoms/Button";
import WrapperHoverCard from "../shared/WrapperHoverCard";
import {
  FlattenedConfig,
  BackendField,
  TAB_TO_STEP_KEY,
  REVIEW_SKIP_SCALAR,
  resolveReviewField,
} from "./requisitionDynamicForm";

import {
  RequisitionPosition as Position,
  RequisitionQualification as Qualification,
  CVFile,
  RequisitionCandidate as Candidate,
  RequisitionFormData,
} from "../../types/recruitment";

interface RequisitionReviewStepProps {
  formData: RequisitionFormData;
  formConfig?: FlattenedConfig | null;
  onSubmit: () => void;
  onBack: () => void;
  submitPending: boolean;
  isEditMode: boolean;
  validationErrors?: string[];
}

export default function RequisitionReviewStep({
  formData,
  formConfig = null,
  onSubmit,
  onBack,
  submitPending,
  isEditMode,
  validationErrors = [],
}: RequisitionReviewStepProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  const renderValue = (val: string | number | boolean | null | undefined) => {
    if (val === undefined || val === null || val === "") return "—";
    if (typeof val === "boolean") return val ? "Yes" : "No";
    return String(val);
  };

  const renderCandidateCV = (
    cv: string | CVFile[] | CVFile | null | undefined,
  ) => {
    if (!cv) return "—";
    if (typeof cv === "string") {
      return (
        <a
          href={cv}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 font-semibold hover:underline"
        >
          View CV
        </a>
      );
    }
    if (Array.isArray(cv) && cv.length > 0) {
      const first = cv[0];
      const url = first?.url || first?.storage || first?.file_url;
      const name = first?.name || "View CV";
      if (url) {
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 font-semibold hover:underline"
          >
            {name}
          </a>
        );
      }
    }
    if (cv && typeof cv === "object" && !Array.isArray(cv)) {
      const url = cv.url || cv.storage || cv.file_url;
      const name = cv.name || "View CV";
      if (url) {
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 font-semibold hover:underline"
          >
            {name}
          </a>
        );
      }
    }
    return "—";
  };

  const positions = formData.positions || [];
  const candidates = formData.custom_pre_screened_candidates || [];
  const hasValidationErrors = validationErrors.length > 0;

  // ── Shared cell renderers ────────────────────────────────────────────────
  const cardClass =
    "bg-slate-50/50 border border-slate-200/60 rounded-xl p-5 space-y-4";
  const headerClass =
    "text-base font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200/60 pb-2";

  // A single label/value cell, with an optional employee hover card.
  const FieldCell = ({
    label,
    display,
    employeeId,
  }: {
    label: string;
    display: ReactNode;
    employeeId?: string;
  }) => (
    <div className="space-y-1">
      <span className="text-slate-400 font-medium block">{label}</span>
      <span className="font-semibold text-slate-800">
        {employeeId ? (
          <WrapperHoverCard employeeId={employeeId}>
            <span className="cursor-help underline decoration-dotted decoration-slate-300 underline-offset-2">
              {display}
            </span>
          </WrapperHoverCard>
        ) : (
          display
        )}
      </span>
    </div>
  );

  // ── Reusable sub-blocks (used by both the dynamic and static renderers) ──
  const SkillsBlock = () =>
    formData.custom_skills ? (
      <div className="col-span-1 md:col-span-2 space-y-1">
        <span className="text-slate-400 font-medium block">Skills Required</span>
        <div className="flex flex-wrap gap-1.5 mt-1 bg-white border rounded p-2">
          {(() => {
            const skillsSource =
              Array.isArray(formData.custom_skills_title) &&
              formData.custom_skills_title.length > 0
                ? formData.custom_skills_title
                : formData.custom_skills;
            const skillsArray = Array.isArray(skillsSource)
              ? skillsSource
              : typeof skillsSource === "string"
                ? skillsSource.split(",").map((s: string) => s.trim())
                : [];

            if (
              skillsArray.length === 0 ||
              (skillsArray.length === 1 && !skillsArray[0])
            ) {
              return <span className="text-slate-400">—</span>;
            }

            return skillsArray.map((skill: string, idx: number) => (
              <span
                key={idx}
                className="inline-flex items-center text-base font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
              >
                {skill}
              </span>
            ));
          })()}
        </div>
      </div>
    ) : null;

  const JobDescriptionBlock = () =>
    formData.description ? (
      <div className="col-span-1 md:col-span-2 space-y-1">
        <span className="text-slate-400 font-medium block">Job Description</span>
        <div
          className="bg-white border rounded-lg p-3 text-slate-700 prose prose-sm max-w-none max-h-40 overflow-y-auto animate-fadeIn"
          dangerouslySetInnerHTML={{ __html: formData.description }}
        />
      </div>
    ) : null;

  const QualificationsBlock = () =>
    Array.isArray(formData.custom_qualifications) &&
    formData.custom_qualifications.length > 0 ? (
      <div className="col-span-1 md:col-span-2 space-y-2">
        <span className="text-slate-400 font-medium block">
          Qualifications Required
        </span>
        <div className="space-y-2">
          {formData.custom_qualifications.map((q: Qualification, idx: number) => (
            <div
              key={idx}
              className="bg-white border rounded-lg p-2.5 flex justify-between items-center text-base shadow-sm"
            >
              <span className="font-semibold text-slate-800">
                {q.qualification}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[14px] font-bold ${q.mandatory === "Required" ? "bg-red-50 text-red-700 border border-red-100" : "bg-blue-50 text-blue-700 border border-blue-100"}`}
              >
                {q.mandatory || "Required"}
              </span>
            </div>
          ))}
        </div>
      </div>
    ) : null;

  const CandidatesBlock = () =>
    candidates.length > 0 ? (
      <div className="space-y-2 pt-2">
        <label className="text-base text-slate-500 font-medium">
          Pre-Screened Candidates
        </label>
        <div className="space-y-3">
          {candidates.map((cand: Candidate, idx: number) => (
            <div
              key={idx}
              className="bg-white border border-slate-150 rounded-lg p-3 shadow-sm space-y-2 text-base"
            >
              <div className="font-bold text-slate-700">
                {cand.candidate_name || `Candidate #${idx + 1}`}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-1">
                <div>
                  <span className="text-[14px] text-slate-400 font-medium block">
                    Email
                  </span>
                  <span className="font-semibold text-slate-800">
                    {renderValue(cand.email)}
                  </span>
                </div>
                <div>
                  <span className="text-[14px] text-slate-400 font-medium block">
                    Phone
                  </span>
                  <span className="font-semibold text-slate-800">
                    {renderValue(cand.phone)}
                  </span>
                </div>
                <div>
                  <span className="text-[14px] text-slate-400 font-medium block">
                    Attachment
                  </span>
                  {renderCandidateCV(cand.cv)}
                </div>
                <div>
                  <span className="text-[14px] text-slate-400 font-medium block">
                    Offer Directly?
                  </span>
                  <span className="font-semibold text-slate-800">
                    {cand.offer_directly ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : null;

  // Position counts + the position details table (dynamic columns driven by the
  // backend `child_groups.custom_position_details`).
  const PositionSelectionBody = () => {
    const posFields: BackendField[] =
      formConfig?.childGroups?.custom_position_details?.fields || [];
    // Inline columns (everything except the nested Cost Center Allocations).
    const inlineFields = posFields.filter((f) => !f.is_nested_table);
    const nestedAllocField = posFields.find((f) => f.is_nested_table);

    return (
      <>
        <div className="grid grid-cols-3 gap-4 text-base bg-white border border-slate-100 p-3 rounded-lg">
          <div className="text-center">
            <span className="text-slate-400 font-medium block">
              Total Positions
            </span>
            <span className="text-lg font-bold text-slate-800">
              {formData.number_of_positions}
            </span>
          </div>
          <div className="text-center border-x">
            <span className="text-slate-400 font-medium block">New</span>
            <span className="text-lg font-bold text-emerald-600">
              {formData.number_of_new_positions}
            </span>
          </div>
          <div className="text-center">
            <span className="text-slate-400 font-medium block">Replacement</span>
            <span className="text-lg font-bold text-orange-600">
              {formData.number_of_replacement_positions}
            </span>
          </div>
        </div>

        {positions.length > 0 && (
          <div className="space-y-2">
            <label className="text-base text-slate-500 font-medium">
              Position Details
            </label>
            <div className="space-y-3">
              {positions.map((pos: Position, idx: number) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-150 rounded-lg p-3 shadow-sm space-y-2 text-base"
                >
                  <div className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block">
                    Position #{pos.position_number || idx + 1} ({pos.vacancy_type})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-1">
                    {inlineFields.map((f) => {
                      // Replacement-only column: hide for New positions.
                      if (
                        f.fieldname === "replacement_for" &&
                        pos.vacancy_type !== "Replacement"
                      ) {
                        return null;
                      }
                      const anyPos = pos as any;
                      const title = anyPos[`${f.fieldname}_title`];
                      const raw = anyPos[f.fieldname];
                      const value =
                        title !== undefined && title !== null && title !== ""
                          ? title
                          : raw;
                      const isEmployee =
                        f.fieldtype === "Link" && f.options === "Employee";
                      return (
                        <div key={f.fieldname}>
                          <span className="text-[14px] text-slate-400 font-medium block">
                            {f.label}
                          </span>
                          <span className="font-semibold text-slate-800">
                            {isEmployee && raw ? (
                              <WrapperHoverCard employeeId={String(raw)}>
                                <span className="cursor-help underline decoration-dotted decoration-slate-300 underline-offset-2">
                                  {renderValue(value)}
                                </span>
                              </WrapperHoverCard>
                            ) : (
                              renderValue(value)
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {nestedAllocField &&
                    Array.isArray((pos as any).cost_center_allocations) &&
                    (pos as any).cost_center_allocations.length > 0 && (
                      <div className="space-y-1.5 mt-1">
                        <span className="text-[14px] text-slate-400 font-medium block">
                          {nestedAllocField.label || "Cost Center Allocation"}
                        </span>
                        <div className="space-y-1.5">
                          {(pos as any).cost_center_allocations.map(
                            (alloc: any, aIdx: number) => (
                              <div
                                key={aIdx}
                                className="bg-slate-50 border border-slate-150 rounded-lg p-2 flex justify-between items-center gap-3"
                              >
                                <span className="font-semibold text-slate-800">
                                  {renderValue(
                                    alloc.cost_center_title ?? alloc.cost_center,
                                  )}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[14px] font-bold bg-blue-50 text-blue-700 border border-blue-100 shrink-0">
                                  {alloc.percentage !== undefined &&
                                  alloc.percentage !== null &&
                                  alloc.percentage !== ""
                                    ? `${alloc.percentage}%`
                                    : "—"}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  // ── Dynamic sections: one card per backend TAB, in the config's order ──
  const renderDynamicSections = (config: FlattenedConfig) => {
    return config.tabs.map((tab, tabIdx) => {
      // Map the tab to a known step key (drives the dedicated blocks). Unknown
      // tabs (e.g. "teast") simply render their scalar fields.
      const stepKey = TAB_TO_STEP_KEY[tab.tab];

      // Scalar fields configured for this tab (dedicated-block fields skipped).
      // Child tables (qualifications, pre-screened candidates, the position
      // table) arrive as `fieldtype: "Table"` fields inside the tab sections on
      // newer backends — they're rendered by their dedicated blocks below, so
      // skip them here (else `renderValue` stringifies the array to garbage).
      const scalarFields: BackendField[] = [];
      (tab.sections || []).forEach((section) => {
        (section.fields || []).forEach((field) => {
          if (REVIEW_SKIP_SCALAR.has(field.fieldname)) return;
          if (field.fieldtype === "Table") return;
          scalarFields.push(field);
        });
      });

      const isJob = stepKey === "jobDetails";
      const isPos = stepKey === "positionSelection";
      const isOther = stepKey === "otherDetails";

      const hasExtraBlocks =
        isPos ||
        (isJob && (formData.custom_skills || formData.description)) ||
        (isOther &&
          ((Array.isArray(formData.custom_qualifications) &&
            formData.custom_qualifications.length > 0) ||
            candidates.length > 0));

      // Nothing configured and no special content → skip the empty card.
      if (scalarFields.length === 0 && !hasExtraBlocks) return null;

      return (
        <div key={`${tab.tab}-${tabIdx}`} className={cardClass}>
          <h3 className={headerClass}>{tab.tab}</h3>

          {scalarFields.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
              {scalarFields.map((field) => {
                const rf = resolveReviewField(field, formData);
                const display =
                  rf.fieldtype === "Check"
                    ? rf.value
                      ? "Yes"
                      : "No"
                    : renderValue(rf.value);
                return (
                  <FieldCell
                    key={rf.fieldname}
                    label={rf.label}
                    display={display}
                    employeeId={rf.employeeId}
                  />
                );
              })}
              {isJob && <SkillsBlock />}
              {isJob && <JobDescriptionBlock />}
            </div>
          )}

          {/* Job Details extras when there were no scalar fields to host them */}
          {isJob && scalarFields.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
              <SkillsBlock />
              <JobDescriptionBlock />
            </div>
          )}

          {isPos && <PositionSelectionBody />}

          {isOther && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
              <QualificationsBlock />
            </div>
          )}
          {isOther && <CandidatesBlock />}
        </div>
      );
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Review Requisition</h2>
        <p className="text-base text-slate-500 mt-1">
          Please review the job requisition details before submitting.
        </p>
      </div>

      {hasValidationErrors && (
        <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-4 flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-base shrink-0 mt-0.5">
            ⚠️
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-semibold text-rose-800">
              Required Information Missing
            </h4>
            <p className="text-base text-rose-600 leading-relaxed">
              The following required fields must be completed before you can
              submit:
            </p>
            <ul className="list-disc list-inside text-[15px] text-rose-600 space-y-0.5 font-medium mt-1">
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {formConfig ? (
          renderDynamicSections(formConfig)
        ) : (
          <StaticReviewSections
            formData={formData}
            positions={positions}
            renderValue={renderValue}
            cardClass={cardClass}
            headerClass={headerClass}
            FieldCell={FieldCell}
            SkillsBlock={SkillsBlock}
            JobDescriptionBlock={JobDescriptionBlock}
            QualificationsBlock={QualificationsBlock}
            CandidatesBlock={CandidatesBlock}
          />
        )}
      </div>

      {/* Acknowledge and Submit */}
      <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-5 space-y-4 mt-6">
        <div className="flex items-start gap-3">
          <input
            id="acknowledge"
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="w-4 h-4 mt-0.5 border-gray-300 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <label
            htmlFor="acknowledge"
            className="text-base text-slate-700 font-medium cursor-pointer select-none leading-relaxed"
          >
            I hereby declare that the details provided in this job requisition
            are accurate, complete, and authorized according to the company's
            hiring guidelines and budget allocations.
          </label>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-between mt-8 gap-4 border-t border-slate-100 pt-6">
        <Button variant="outline" onClick={onBack}>
          Previous
        </Button>
        <Button
          bgColor="primary"
          onClick={onSubmit}
          disabled={!acknowledged || hasValidationErrors}
          loading={submitPending}
        >
          {submitPending
            ? isEditMode
              ? "Saving…"
              : "Submitting…"
            : isEditMode
              ? "Save Changes"
              : "Submit Requisition"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Static fallback layout — used only when the backend form config hasn't loaded
// (or failed). Mirrors the original hardcoded review so the page always works.
// ---------------------------------------------------------------------------
function StaticReviewSections({
  formData,
  positions,
  renderValue,
  cardClass,
  headerClass,
  FieldCell,
  SkillsBlock,
  JobDescriptionBlock,
  QualificationsBlock,
  CandidatesBlock,
}: {
  formData: RequisitionFormData;
  positions: Position[];
  renderValue: (v: any) => ReactNode;
  cardClass: string;
  headerClass: string;
  FieldCell: (p: {
    label: string;
    display: ReactNode;
    employeeId?: string;
  }) => ReactElement;
  SkillsBlock: () => ReactElement | null;
  JobDescriptionBlock: () => ReactElement | null;
  QualificationsBlock: () => ReactElement | null;
  CandidatesBlock: () => ReactElement | null;
}) {
  const basic: { label: string; value: any; employeeId?: string }[] = [
    {
      label: "Hiring Manager",
      value: formData.hiring_manager_title ?? formData.hiring_manager,
      employeeId: formData.hiring_manager,
    },
    { label: "Company", value: formData.company_title ?? formData.company },
    {
      label: "Department",
      value: formData.department_title ?? formData.department,
    },
    {
      label: "Designation",
      value: formData.designation_title ?? formData.designation,
    },
    {
      label: "Functional Area",
      value: formData.functional_area_title ?? formData.functional_area,
    },
  ];

  const job: { label: string; value: any; employeeId?: string }[] = [
    { label: "Recruitment Start Date", value: formData.recruitment_start_date },
    {
      label: "Hiring Lead",
      value: formData.hiring_lead_title ?? formData.hiring_lead,
      employeeId: formData.hiring_lead,
    },
    { label: "Expected By Date", value: formData.expected_by },
    {
      label: "Employment Type",
      value: formData.employment_type_title ?? formData.employment_type,
    },
    { label: "Work Location", value: formData.location_title ?? formData.location },
    {
      label: "Experience Range (From/To)",
      value:
        formData.experience_from !== undefined ||
        formData.experience_to !== undefined
          ? `${formData.experience_from ?? "0"} - ${formData.experience_to ?? "—"} ${formData.experience_unit ?? "years"}`
          : "—",
    },
    {
      label: "Salary Currency",
      value: formData.salary_currency_title ?? formData.salary_currency,
    },
    {
      label: "Salary Range",
      value:
        formData.salary_min && formData.salary_max
          ? `${formData.salary_min} - ${formData.salary_max}`
          : "—",
    },
    { label: "Salary Timeframe", value: formData.salary_timeframe },
    { label: "Expected Compensation", value: formData.expected_compensation },
    {
      label: "Notice Period Required",
      value: formData.custom_preferred_notice_period,
    },
    {
      label: "Preferred Target Company",
      value: formData.preferred_company_title ?? formData.preferred_company,
    },
    {
      label: "Other Preferred Companies",
      value: formData.custom_other_preferred_companies,
    },
    {
      label: "Position Specific Requirements",
      value: (formData as any).additional_roles_responsibilities,
    },
  ];

  const other: { label: string; value: any }[] = [
    { label: "Comments / Instruction", value: (formData as any).comments_instructions },
  ];

  return (
    <>
      <div className={cardClass}>
        <h3 className={headerClass}>Basic Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
          {basic.map((f) => (
            <FieldCell
              key={f.label}
              label={f.label}
              display={renderValue(f.value)}
              employeeId={f.employeeId ? String(f.employeeId) : undefined}
            />
          ))}
        </div>
      </div>

      <div className={cardClass}>
        <h3 className={headerClass}>Job Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
          {job.map((f) => (
            <FieldCell
              key={f.label}
              label={f.label}
              display={renderValue(f.value)}
              employeeId={f.employeeId ? String(f.employeeId) : undefined}
            />
          ))}
          <SkillsBlock />
          <JobDescriptionBlock />
        </div>
      </div>

      <div className={cardClass}>
        <h3 className={headerClass}>Position Selection</h3>
        <div className="grid grid-cols-3 gap-4 text-base bg-white border border-slate-100 p-3 rounded-lg">
          <div className="text-center">
            <span className="text-slate-400 font-medium block">
              Total Positions
            </span>
            <span className="text-lg font-bold text-slate-800">
              {formData.number_of_positions}
            </span>
          </div>
          <div className="text-center border-x">
            <span className="text-slate-400 font-medium block">New</span>
            <span className="text-lg font-bold text-emerald-600">
              {formData.number_of_new_positions}
            </span>
          </div>
          <div className="text-center">
            <span className="text-slate-400 font-medium block">Replacement</span>
            <span className="text-lg font-bold text-orange-600">
              {formData.number_of_replacement_positions}
            </span>
          </div>
        </div>
        {positions.length > 0 && (
          <div className="space-y-2">
            <label className="text-base text-slate-500 font-medium">
              Position Details
            </label>
            <div className="space-y-3">
              {positions.map((pos: Position, idx: number) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-150 rounded-lg p-3 shadow-sm space-y-2 text-base"
                >
                  <div className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block">
                    Position #{pos.position_number || idx + 1} ({pos.vacancy_type})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-1">
                    <div>
                      <span className="text-[14px] text-slate-400 font-medium block">
                        Location
                      </span>
                      <span className="font-semibold text-slate-800">
                        {renderValue(pos.location_title ?? pos.location)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[14px] text-slate-400 font-medium block">
                        Functional Area
                      </span>
                      <span className="font-semibold text-slate-800">
                        {renderValue(
                          pos.functional_area_title ?? pos.functional_area,
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-[14px] text-slate-400 font-medium block">
                        Reporting Manager
                      </span>
                      <span className="font-semibold text-slate-800">
                        {renderValue(
                          pos.reporting_manager_title ?? pos.reporting_manager,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={cardClass}>
        <h3 className={headerClass}>Other Details &amp; Requirements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
          {other.map((f) => (
            <FieldCell
              key={f.label}
              label={f.label}
              display={renderValue(f.value)}
            />
          ))}
          <QualificationsBlock />
        </div>
        <CandidatesBlock />
      </div>
    </>
  );
}
