/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// Review step for the config-driven Job Requisition form (V2).
//
// Everything here is read off the SAME config the form was built from, so the
// review mirrors the form exactly: one card per tab, a heading per section, and
// fields in the order the settings doc puts them. Nothing is hardcoded, so a
// field added or moved in the builder shows up in the right place here too.
//
// Hiring type is already resolved server-side — the config for "Fresher" ships
// the Regions table (and drops Position Details), the config for "Lateral" does
// the reverse — so walking the config is all that's needed to review either.
//
// Empty is invisible: a blank field, a table with no rows, a section whose
// fields are all blank, and a tab whose sections are all empty are dropped
// rather than rendered as a wall of dashes.
// ---------------------------------------------------------------------------
import { useState } from "react";
import type { ReactNode } from "react";
import Button from "../shared/atoms/Button";
import WrapperHoverCard from "../shared/WrapperHoverCard";
import formatToIndianDate from "../../utils/formatToIndianDate";
import {
  BackendField,
  BackendSection,
  FormConfig,
  formKey,
  evalDependsOn,
  isBlankValue,
} from "./requisitionV2Config";

interface RequisitionReviewV2Props {
  config: FormConfig | null;
  formData: Record<string, any>;
  onSubmit: () => void;
  onBack: () => void;
  submitPending: boolean;
  isEditMode?: boolean;
  validationErrors?: string[];
}

// Columns the backend fills in after submission — nothing to review up front.
// They are blank on a new requisition anyway; listing them keeps them out of an
// edit-mode review too.
const REVIEW_SKIP_CHILD_FIELDS = new Set([
  "approval_status",
  "approved_by",
  "approved_on",
  "active_employees",
]);

const cardClass =
  "bg-slate-50/50 border border-slate-200/60 rounded-xl p-5 space-y-5";
const tabHeaderClass =
  "text-base font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200/60 pb-2";
const sectionHeaderClass =
  "text-[13px] font-bold text-slate-500 uppercase tracking-wide";
const labelClass = "text-[14px] text-slate-400 font-medium block";
const valueClass = "font-semibold text-slate-800";

/** The form-data value for a field, preferring the resolved `_title` companion. */
function fieldValue(field: BackendField, data: Record<string, any>) {
  const key = formKey(field.fieldname);
  const title = data[`${key}_title`];
  return !isBlankValue(title) ? title : data[key];
}

/** Same, for one child-table row. */
function rowValue(field: BackendField, row: Record<string, any>) {
  const title = row[`${field.fieldname}_title`];
  return !isBlankValue(title) ? title : row[field.fieldname];
}

const isEmployeeLink = (field: BackendField) =>
  field.fieldtype === "Link" && field.options === "Employee";

/** A row counts as filled when any reviewable column in it has a value. */
const rowHasContent = (row: any, fields: BackendField[]) =>
  fields.some((f) => !isBlankValue(row?.[f.fieldname]));

export default function RequisitionReviewV2({
  config,
  formData,
  onSubmit,
  onBack,
  submitPending,
  isEditMode = false,
  validationErrors = [],
}: RequisitionReviewV2Props) {
  const [acknowledged, setAcknowledged] = useState(false);
  const hasValidationErrors = validationErrors.length > 0;

  // ── Value renderers ──────────────────────────────────────────────────────

  const formatScalar = (field: BackendField, value: any): ReactNode => {
    if (field.fieldtype === "Check") return value ? "Yes" : "No";
    if (field.fieldtype === "Date" || field.fieldtype === "Datetime") {
      // The util takes a Date, a timestamp or any reasonable date string —
      // Form.io hands back all three depending on the widget.
      return formatToIndianDate(value as string | number | Date);
    }
    if (Array.isArray(value)) return value.join(", ");
    return String(value);
  };

  const Cell = ({
    label,
    children,
    wide = false,
  }: {
    label: string;
    children: ReactNode;
    wide?: boolean;
  }) => (
    <div className={`space-y-1 ${wide ? "col-span-1 md:col-span-2" : ""}`}>
      <span className={labelClass}>{label}</span>
      <div className={valueClass}>{children}</div>
    </div>
  );

  const EmployeeValue = ({ id, label }: { id: any; label: ReactNode }) => (
    <WrapperHoverCard employeeId={String(id)}>
      <span className="cursor-help underline decoration-dotted decoration-slate-300 underline-offset-2">
        {label}
      </span>
    </WrapperHoverCard>
  );

  const AttachValue = ({ value }: { value: any }) => {
    const url =
      typeof value === "string"
        ? value
        : value?.url || value?.file_url || value?.storage;
    if (!url) return <>{String(value)}</>;
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 font-semibold hover:underline"
      >
        {value?.name || "View attachment"}
      </a>
    );
  };

  // ── Field renderers ──────────────────────────────────────────────────────

  const renderScalarField = (field: BackendField) => {
    const value = fieldValue(field, formData);
    if (isBlankValue(value)) return null;

    if (field.fieldtype === "Text Editor") {
      return (
        <Cell key={field.fieldname} label={field.label} wide>
          <div
            className="bg-white border rounded-lg p-3 text-slate-700 prose prose-sm max-w-none max-h-40 overflow-y-auto font-normal"
            dangerouslySetInnerHTML={{ __html: String(value) }}
          />
        </Cell>
      );
    }

    const isLongText =
      field.fieldtype === "Small Text" || field.fieldtype === "Long Text";

    return (
      <Cell key={field.fieldname} label={field.label} wide={isLongText}>
        {isEmployeeLink(field) ? (
          <EmployeeValue
            id={formData[formKey(field.fieldname)]}
            label={formatScalar(field, value)}
          />
        ) : field.fieldtype === "Attach" || field.fieldtype === "Attach Image" ? (
          <AttachValue value={value} />
        ) : isLongText ? (
          <span className="whitespace-pre-line">{formatScalar(field, value)}</span>
        ) : (
          formatScalar(field, value)
        )}
      </Cell>
    );
  };

  // Table MultiSelect (e.g. Skills) — chips, from the resolved titles when the
  // form kept them, else the raw ids.
  const renderMultiSelectField = (field: BackendField) => {
    const key = formKey(field.fieldname);
    const source = !isBlankValue(formData[`${key}_title`])
      ? formData[`${key}_title`]
      : formData[key];
    const items = (Array.isArray(source) ? source : [source])
      .map((item: any) =>
        item && typeof item === "object"
          ? item.label ?? item.value ?? item.id ?? ""
          : item
      )
      .filter((item: any) => !isBlankValue(item));

    if (items.length === 0) return null;

    return (
      <Cell key={field.fieldname} label={field.label} wide>
        <div className="flex flex-wrap gap-1.5">
          {items.map((item: any, idx: number) => (
            <span
              key={idx}
              className="inline-flex items-center text-[15px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
            >
              {String(item)}
            </span>
          ))}
        </div>
      </Cell>
    );
  };

  // No of. Positions — the form splits it into Total / New / Replacement, so
  // the review shows the same trio. The split only exists for hiring types that
  // carry the Position Details table; otherwise just the total.
  const renderPositionCounts = (field: BackendField) => {
    const total = formData.number_of_positions;
    if (isBlankValue(total)) return null;
    const hasSplit = Array.isArray(formData.positions) && formData.positions.length > 0;

    return (
      <div
        key={field.fieldname}
        className={`col-span-1 md:col-span-2 grid ${hasSplit ? "grid-cols-3" : "grid-cols-1"} gap-4 bg-white border border-slate-100 p-3 rounded-lg`}
      >
        <div className="text-center">
          <span className={labelClass}>{field.label || "Total Positions"}</span>
          <span className="text-lg font-bold text-slate-800">{total}</span>
        </div>
        {hasSplit && (
          <>
            <div className="text-center border-x">
              <span className={labelClass}>New</span>
              <span className="text-lg font-bold text-emerald-600">
                {formData.number_of_new_positions || 0}
              </span>
            </div>
            <div className="text-center">
              <span className={labelClass}>Replacement</span>
              <span className="text-lg font-bold text-orange-600">
                {formData.number_of_replacement_positions || 0}
              </span>
            </div>
          </>
        )}
      </div>
    );
  };

  // A child table (Vacancy Details, Regions, Pre-Screened Candidates,
  // Qualifications): one card per filled row, columns straight from the config.
  const renderTable = (field: BackendField, rows: any[], titleOfRow?: (row: any, idx: number) => ReactNode) => {
    const columns = (field.child_fields || []).filter(
      (child) => !child.is_nested_table && !REVIEW_SKIP_CHILD_FIELDS.has(child.fieldname)
    );
    const nested = (field.child_fields || []).filter((child) => child.is_nested_table);
    const filledRows = rows.filter((row) => rowHasContent(row, columns.length ? columns : field.child_fields || []));
    if (filledRows.length === 0) return null;

    return (
      <div key={field.fieldname} className="col-span-1 md:col-span-2 space-y-2">
        <span className={labelClass}>{field.label}</span>
        <div className="space-y-3">
          {filledRows.map((row: any, idx: number) => (
            <div
              key={idx}
              className="bg-white border border-slate-150 rounded-lg p-3 shadow-sm space-y-2"
            >
              {titleOfRow && titleOfRow(row, idx)}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {columns.map((child) => {
                  // Hidden on this row (e.g. Replacement-only columns on a New
                  // row) — never reviewed.
                  if (child.depends_on && !evalDependsOn(child.depends_on, true, formData, row)) {
                    return null;
                  }
                  const value = rowValue(child, row);
                  if (isBlankValue(value)) return null;
                  return (
                    <div key={child.fieldname}>
                      <span className={labelClass}>{child.label}</span>
                      <span className={valueClass}>
                        {isEmployeeLink(child) ? (
                          <EmployeeValue
                            id={row[child.fieldname]}
                            label={formatScalar(child, value)}
                          />
                        ) : child.fieldtype === "Attach" ? (
                          <AttachValue value={value} />
                        ) : (
                          formatScalar(child, value)
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              {nested.map((child) => {
                const allocations = Array.isArray(row[child.fieldname])
                  ? row[child.fieldname]
                  : [];
                const filled = allocations.filter((entry: any) =>
                  (child.nested_fields || []).some((n) => !isBlankValue(entry?.[n.fieldname]))
                );
                if (filled.length === 0) return null;
                return (
                  <div key={child.fieldname} className="space-y-1.5 pt-1">
                    <span className={labelClass}>
                      {child.nested_label || child.label}
                    </span>
                    <div className="space-y-1.5">
                      {filled.map((entry: any, entryIdx: number) => (
                        <div
                          key={entryIdx}
                          className="bg-slate-50 border border-slate-150 rounded-lg p-2 flex justify-between items-center gap-3"
                        >
                          <span className={valueClass}>
                            {entry.cost_center_title ?? entry.cost_center}
                          </span>
                          {!isBlankValue(entry.percentage) && (
                            <span className="px-2 py-0.5 rounded text-[14px] font-bold bg-blue-50 text-blue-700 border border-blue-100 shrink-0">
                              {entry.percentage}%
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTableField = (field: BackendField) => {
    const rows = formData[formKey(field.fieldname)];
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const isPositions = field.fieldname === "custom_position_details";
    return renderTable(
      field,
      rows,
      isPositions
        ? (row, idx) => (
            <div className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block text-[15px]">
              Position #{row.position_number || idx + 1}
              {row.vacancy_type ? ` (${row.vacancy_type})` : ""}
            </div>
          )
        : rows.length > 1
          ? (_row, idx) => (
              <div className="font-bold text-slate-500 text-[14px]">#{idx + 1}</div>
            )
          : undefined
    );
  };

  const renderField = (field: BackendField): ReactNode => {
    // Conditionally hidden on the form → not part of this requisition.
    if (field.depends_on && !evalDependsOn(field.depends_on, false, formData)) {
      return null;
    }
    if (field.fieldname === "no_of_positions") return renderPositionCounts(field);
    if (field.fieldtype === "Table MultiSelect") return renderMultiSelectField(field);
    if (field.fieldtype === "Table") return renderTableField(field);
    return renderScalarField(field);
  };

  // ── Config walk: tab → section → field ───────────────────────────────────

  // Child groups (Qualifications) live outside `tabs`, and the form renders them
  // on the Other Details step — the review follows.
  const childGroupsFor = (tabLabel: string): ReactNode[] => {
    if (!/other details/i.test(tabLabel)) return [];
    const group = config?.child_groups?.custom_qualifications;
    const rows = formData.custom_qualifications;
    if (!group || !Array.isArray(rows) || rows.length === 0) return [];
    const rendered = renderTable(
      {
        fieldname: "custom_qualifications",
        label: group.group || "Qualifications",
        fieldtype: "Table",
        child_fields: group.fields || [],
      } as BackendField,
      rows
    );
    return rendered ? [rendered] : [];
  };

  const renderSection = (section: BackendSection, key: string) => {
    const fields = (section.fields || [])
      .map((field) => renderField(field))
      .filter(Boolean);
    if (fields.length === 0) return null;

    return (
      <div key={key} className="space-y-3">
        {section.section && <h4 className={sectionHeaderClass}>{section.section}</h4>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
          {fields}
        </div>
      </div>
    );
  };

  const renderTabs = () =>
    (config?.tabs || [])
      .map((tab, tabIdx) => {
        const sections = (tab.sections || [])
          .map((section, sectionIdx) =>
            renderSection(section, `${tab.tab}-${sectionIdx}`)
          )
          .filter(Boolean);
        const extras = childGroupsFor(tab.tab);

        // Nothing filled on this step → no empty card.
        if (sections.length === 0 && extras.length === 0) return null;

        return (
          <div key={`${tab.tab}-${tabIdx}`} className={cardClass}>
            <h3 className={tabHeaderClass}>{tab.tab}</h3>
            {sections}
            {extras.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
                {extras}
              </div>
            )}
          </div>
        );
      })
      .filter(Boolean);

  const cards = renderTabs();

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
        {cards.length > 0 ? (
          cards
        ) : (
          <div className="text-center py-10 text-slate-500 text-base">
            Nothing to review yet — go back and fill in the requisition details.
          </div>
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
        <Button variant="outline" size="md" onClick={onBack}>
          Previous
        </Button>
        <Button
          bgColor="primary"
          size="md"
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
