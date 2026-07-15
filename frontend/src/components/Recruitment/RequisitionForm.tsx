/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Form } from "@tsed/react-formio";
import {
  requisitionSteps,
  requisitionFormSchemas,
  FormSchemaKeys,
} from "./requisitionFormSchemas";
import {
  applyDynamicConfig,
  flattenConfig,
  childGateApplies,
  childFieldMandatory,
  nestedFieldMandatory,
  buildSteps,
  buildDynamicTabComponents,
  isDynamicStepKey,
  requiredRulesForDynamicTab,
  requiredRulesForKnownTab,
  collectDynamicTabValues,
  dynamicChildGroupFieldnames,
  mergeDynamicValues,
  FlattenedConfig,
  JobRequisitionFormConfig,
} from "./requisitionDynamicForm";
import RequisitionReviewStep from "./RequisitionReviewStep";
import FormEmployeeHoverLayer from "./FormEmployeeHoverLayer";
import PositionColumnCopyButtons from "./PositionColumnCopyButtons";
import Button from "../shared/atoms/Button";
import { useCurrentUser, isAdminUser } from "../../hooks/useCurrentUser";
import { useCurrentEmployeeDetails, useFileUpload } from "../../hooks/useEmployee";
import { useDeleteDocument } from "../../hooks/payroll/UseDeleteDocuemt";
import { useCreateJobRequisition } from "../../hooks/useRecruitment";
import { useLoadingOverlay } from "../../context/OverlayContext";
import {
  JobRequisitionFormData,
  CreateJobRequisitionPayload,
} from "../../types/recruitment";
import toast from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import FrappeAPI from "../../utils/frappeAPI";
import BulkResumeUploadModal, { type UploadedResume } from "./BulkResumeUploadModal";
import { requisitionService } from "../../services/requisitionService";
import { useQueryClient } from "@tanstack/react-query";
import { Edit, X, FileText, Loader2 } from "lucide-react";
import { IoMdCloudUpload } from "react-icons/io";
import "../../formio.custom.css";

// Normalise any date the form may hold — ISO (yyyy-mm-dd), Indian (dd-MM-yyyy),
// a Date, or a full ISO timestamp — into the backend's yyyy-mm-dd. Dates are
// displayed as dd-MM-yyyy in the form, so the payload must accept that too.
const toBackendDate = (v: unknown): string => {
  const today = () => new Date().toISOString().split("T")[0];
  if (!v) return today();
  if (typeof v === "string") {
    const dmy = v.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
    const ymd = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  }
  const d = new Date(v as any);
  return isNaN(d.getTime()) ? today() : d.toISOString().split("T")[0];
};

// ---------------------------------------------------------------------------
// Validation config per step index
// ---------------------------------------------------------------------------
// Keyed by step KEY (not numeric index) so validation survives the dynamic,
// backend-driven tab order.
const stepValidationRules: Record<string, { key: string; label: string }[]> = {
  basicDetails: [
    { key: "hiring_manager", label: "Hiring Manager" },
    { key: "company", label: "Company" },
    { key: "department", label: "Department" },
    { key: "designation", label: "Designation" },
    // Functional Area is auto-derived from Designation (read-only, not
    // mandatory) — so it is NOT part of the required gate.
  ],
  jobDetails: [
    { key: "salary_currency", label: "Salary Range (Currency)" },
    { key: "salary_min", label: "Salary Range (Min)" },
    { key: "salary_max", label: "Salary Range (Max)" },
    { key: "salary_timeframe", label: "Salary Timeframe" },
    { key: "expected_by", label: "Expected By Date" },
    { key: "employment_type", label: "Employment Type" },
    { key: "location", label: "Location" },
  ],
  positionSelection: [
    // positions validated dynamically below
  ],
};

function validateStep(
  stepKey: string,
  formData: JobRequisitionFormData,
  formConfig: FlattenedConfig | null = null
): string[] {
  const errors: string[] = [];

  // Required-field rules for this step are driven ENTIRELY by the API response:
  // a field is validated only when the backend returns it AND marks it mandatory.
  // A field that isn't in the API config is never validated.
  //   • dynamic (brand-new) backend tab → every field it marks mandatory.
  //   • known tab → the fields the backend returns for that tab and marks
  //     mandatory (mapped back to their form-data keys).
  // Only when the config failed to load do we fall back to the static hardcoded
  // gate list, so the form still validates offline.
  let rules: { key: string; label: string }[];
  if (isDynamicStepKey(stepKey)) {
    rules = requiredRulesForDynamicTab(stepKey, formConfig);
  } else if (formConfig) {
    rules = requiredRulesForKnownTab(stepKey, formConfig);
  } else {
    rules = stepValidationRules[stepKey] ?? [];
  }
  for (const rule of rules) {
    const val = (formData as any)[rule.key];
    // Multi-select fields hold an empty array when nothing is selected, so an
    // empty array must also fail the required check.
    if (
      val === undefined ||
      val === null ||
      val === "" ||
      (Array.isArray(val) && val.length === 0)
    ) {
      errors.push(`${rule.label} is required.`);
    }
  }

  // Position Selection: validate position rows
  if (stepKey === "positionSelection") {
    const positions: any[] = (formData as any).positions ?? [];
    const total = Number((formData as any).number_of_positions) || 0;
    const newPos = Number((formData as any).number_of_new_positions) || 0;
    const repPos = Number((formData as any).number_of_replacement_positions) || 0;

    if (positions.length === 0) {
      errors.push("At least one position is required.");
    }
    if (total > 0 && newPos + repPos !== total) {
      errors.push("New Positions + Replacement Positions must equal Total Positions.");
    }
    positions.forEach((pos, i) => {
      // Per-column required checks follow the backend child-group config: a
      // column the backend marks optional (or omits) no longer blocks the step.
      // vacancy_type is a structural New/Replacement control, always required.
      // staticDefault is `!formConfig`: when the API config is loaded, a column
      // absent from it is never required; only when config failed to load do the
      // static defaults apply.
      const colRequired = (fieldname: string) =>
        childFieldMandatory(
          "custom_position_details",
          fieldname,
          formConfig,
          !formConfig
        );

      if (!pos.vacancy_type) {
        errors.push(`Position ${i + 1}: Vacancy Type is required.`);
      }
      if (colRequired("location") && !pos.location) {
        errors.push(`Position ${i + 1}: Location is required.`);
      }
      // Functional Area is auto-derived from the requisition designation
      // (read-only) — never block the user on it.
      if (colRequired("reporting_manager") && !pos.reporting_manager) {
        errors.push(`Position ${i + 1}: Reporting Manager is required.`);
      }
      if (pos.vacancy_type === "Replacement" && !pos.replacement_for) {
        errors.push(`Position ${i + 1}: Replacement for is required.`);
      }

      // Cost Center Allocation validation runs only when the backend config
      // includes the cost_center_allocations column (the column is hidden
      // otherwise, so requiring it would block submit with no way to fill it).
      if (
        childGateApplies(
          "custom_position_details",
          "cost_center_allocations",
          formConfig
        )
      ) {
      // Cost Center Allocation: required-ness follows the backend nested_fields
      // config (custom_position_details → cost_center_allocations → cost_center /
      // percentage). The allocation table itself is required only when the
      // backend marks the cost_center_allocations column mandatory; each nested
      // column is enforced only when its own is_mandatory flag is set.
      const allocations: any[] = Array.isArray(pos.cost_center_allocations)
        ? pos.cost_center_allocations
        : [];
      const isFilled = (v: any) =>
        v !== undefined && v !== null && v !== "";

      const allocationRequired = childFieldMandatory(
        "custom_position_details",
        "cost_center_allocations",
        formConfig,
        !formConfig
      );
      const ccRequired = nestedFieldMandatory(
        "custom_position_details",
        "cost_center_allocations",
        "cost_center",
        formConfig,
        !formConfig
      );
      const pctRequired = nestedFieldMandatory(
        "custom_position_details",
        "cost_center_allocations",
        "percentage",
        formConfig,
        !formConfig
      );

      const hasAllocation = allocations.some((a) => a && isFilled(a.cost_center));
      if (allocationRequired && !hasAllocation) {
        errors.push(`Position ${i + 1}: Cost Center Allocation is required.`);
      }
      allocations.forEach((a, j) => {
        if (!a) return;
        const hasCC = isFilled(a.cost_center);
        const hasPct = isFilled(a.percentage);
        // A partially-filled allocation row must complete the columns the
        // backend marks mandatory.
        if (pctRequired && hasCC && !hasPct) {
          errors.push(
            `Position ${i + 1} (Allocation ${j + 1}): Percentage is required.`
          );
        }
        if (ccRequired && !hasCC && hasPct) {
          errors.push(
            `Position ${i + 1} (Allocation ${j + 1}): Cost Center is required.`
          );
        }
      });

      // No duplicate cost centers within the same position.
      const seenCC = new Set<string>();
      const reportedDup = new Set<string>();
      allocations.forEach((a) => {
        const cc = a?.cost_center;
        if (!isFilled(cc)) return;
        if (seenCC.has(cc) && !reportedDup.has(cc)) {
          errors.push(
            `Position ${i + 1}: Cost Center "${cc}" is selected more than once.`
          );
          reportedDup.add(cc);
        }
        seenCC.add(cc);
      });

      // All cost center allocation percentages must total exactly 100%.
      const filledAllocs = allocations.filter((a) => a && isFilled(a.cost_center));
      if (filledAllocs.length > 0) {
        const sum = filledAllocs.reduce(
          (acc, a) => acc + (Number(a.percentage) || 0),
          0
        );
        // Round to 2 decimals to avoid floating-point drift.
        const rounded = Math.round(sum * 100) / 100;
        if (rounded !== 100) {
          errors.push(
            `Position ${i + 1}: Cost Center Allocation percentages must total 100% (currently ${rounded}%).`
          );
        }
      }
      }
    });
  }

  // Other Details: validate qualifications — only when the API config includes
  // the qualifications table (or the config failed to load).
  const qualConfigured =
    !formConfig || Boolean(formConfig.childGroups?.custom_qualifications);
  if (stepKey === "otherDetails" && qualConfigured) {
    const qualifications = (formData as any).custom_qualifications ?? [];
    qualifications.forEach((q: any, i: number) => {
      if (!q.qualification || !q.qualification.trim()) {
        errors.push(`Qualification ${i + 1}: Qualification is required.`);
      }
      if (!q.mandatory) {
        errors.push(`Qualification ${i + 1}: Mandatory? selection is required.`);
      }
    });
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Helper: map an existing requisition (API shape) → JobRequisitionFormData
// ---------------------------------------------------------------------------
function mapRequisitionToFormData(req: any): Partial<JobRequisitionFormData> {
  const customPositionDetails = req.custom_position_details || [];

  // Work experience reverse-map
  let custom_work_experience_range: string | undefined;
  const exp = req.custom_work_experience;
  if (exp === "Fresher") custom_work_experience_range = "Fresher";
  else if (exp === "1 - 3 Years") custom_work_experience_range = "1 - 3 Years";
  else if (exp === "4 - 5 years") custom_work_experience_range = "4 - 5 Years";
  else if (exp === "5 - 10 years") custom_work_experience_range = "5 - 10 Years";
  else custom_work_experience_range = exp;

  return {
    company: req.company,
    department: req.department,
    designation: req.designation,
    functional_area: req.custom_functional_area,
    hiring_manager: req.requested_by,
    hiring_lead: req.custom_hiring_lead,
    custom_division: req.custom_division,
    location: req.custom_location,

    // Human-readable titles (display-only) the API returns alongside the ids,
    // so the Review tab shows titles instead of raw ids on edit.
    company_title: req.company,
    department_title: req.department_title,
    designation_title: req.designation_title,
    functional_area_title: req.custom_functional_area_title,
    hiring_manager_title: req.requested_by_title || req.custom_requested_by_title,
    hiring_lead_title: req.custom_hiring_lead_title,
    location_title: req.custom_location_title,
    employment_type_title: req.custom_employment_type_link_title,
    preferred_company_title: req.custom_preferred_company_title,
    salary_currency_title: req.custom_salary_range_currency,
    reason_for_requesting: req.reason_for_requesting,
    description: req.description,
    job_description_template: req.custom_job_description_template,

    // Position
    number_of_positions: req.no_of_positions || customPositionDetails.length || 1,
    number_of_new_positions: customPositionDetails.length
      ? customPositionDetails.filter((p: any) => (p.vacancy_type || "New") === "New").length
      : 1,
    number_of_replacement_positions: customPositionDetails.length
      ? customPositionDetails.filter((p: any) => p.vacancy_type === "Replacement").length
      : 0,
    // Keep the link id as each select's value (so buildPayload sends ids), and
    // carry the human-readable title alongside in a `_title` field for display.
    positions: customPositionDetails.map((p: any, i: number) => ({
      position_number: i + 1,
      vacancy_type: p.vacancy_type || "New",

      location: p.location,
      location_title: p.location_title,

      sub_location: p.sub_location,
      sub_location_title: p.sub_location_title,

      functional_area: p.functional_area,
      functional_area_title: p.functional_area_title,

      reporting_manager: p.reporting_manager,
      reporting_manager_title: p.reporting_manager_title,

      replacement_for: p.replacement_for,
      replacement_for_title: p.replacement_for_title,

      // Backend-generated "Employee Type" column — carry the saved value (and
      // its title) so the field isn't empty on edit.
      employee_type: p.employee_type,
      employee_type_title: p.employee_type_title,

      cost_center_allocations: p.cost_center_allocations,
    })),

    // Requirements
    custom_employee_type: req.custom__employee_type,
    employment_type: req.custom_employment_type_link,
    custom_work_experience_range,
    experience_from: req.custom_experience_range_from,
    experience_to: req.custom_experience_range_to,
    experience_unit: req.custom_experience_unit,
    custom_preferred_notice_period: req.custom_preferred_notice_period,
    preferred_company: req.custom_preferred_company,
    custom_other_preferred_companies: req.custom_other_preferred_companies,
    additional_roles_responsibilities: req.custom_additional_roles__responsibilities,
    additional_skills: req.custom_additional_skills,
    comments_instructions: req.custom_comments__instructions,
    cost_centre: req.custom_cost_centre,
    designation_change: req.custom_designation_change,
    custom_qualifications: req.custom_qualifications,
    custom_skills: req.custom_skills,
    custom_assign_to_recruiter: req.custom_assign_to_recruiter,
    custom_pre_screened_candidates: req.custom_pre_screened_candidates,

    // Compensation
    salary_currency: req.custom_salary_range_currency,
    salary_min: req.custom_salary_range_min,
    salary_max: req.custom_salary_range_max,
    salary_timeframe: req.custom_salary_timeframe,
    expected_compensation: req.expected_compensation ? Number(req.expected_compensation) : undefined,

    // Dates
    recruitment_start_date: req.posting_date,
    expected_by: req.expected_by,
  } as Partial<JobRequisitionFormData>;
}

// ---------------------------------------------------------------------------
// Make form.io URL <select> fields display the selected option's LABEL (not the
// raw id) after a step is unmounted/remounted on tab switch.
//
// By default url selects lazy-load their options, so on remount they only have
// the stored value (id) and render it verbatim — e.g. "DEP_472" instead of the
// department name. Disabling lazyLoad loads the options on mount, and setting
// searchField lets form.io re-fetch the option for the current value (the
// backend supports a `search_text` filter) so its label resolves even when the
// value isn't in the first page of results. Applied recursively so nested
// datagrid / columns selects (position rows) are covered too.
//
// Inside a datagrid, eager-loading fires one request + builds one Choices widget
// per row × per select, so a very large grid (100 rows → hundreds of
// simultaneous loads) can freeze the page. To both resolve labels (so the
// position rows show titles, not ids) AND stay safe, grid selects eager-load
// only when the grid is reasonably small (eagerGrid); above that they stay lazy
// (form.io's default) and only fetch when the user opens the dropdown.
// ---------------------------------------------------------------------------
function enableUrlSelectLabels(
  components: any[],
  insideGrid = false,
  eagerGrid = false
): any[] {
  if (!Array.isArray(components)) return components;
  return components.map((c) => {
    const next: any = { ...c };
    if (next.type === "select" && next.dataSrc === "url") {
      // Eager-load top-level selects always; grid selects only when the grid is
      // small enough (eagerGrid) — so their saved id resolves to a label.
      // EXCEPTION: dependent selects (those with refreshOn, e.g. Department
      // depends on Company, Designation on Department) must stay lazy. Eager-
      // loading them fires the request on mount with an empty parent value
      // (…&company=&disabled=0). Keeping them lazy means they only fetch once
      // their parent is set, via the refreshOn wiring.
      // EXCEPTION 2: honor an explicit `lazyLoad: true` from the schema. Selects
      // in a *nested* repeating grid (e.g. Cost Center inside each position's
      // Cost Center Allocation table) must stay lazy — eager-loading rebuilds &
      // re-fetches every row's widget on each "Add Row", which flashes/resets
      // the already-filled rows.
      if ((!insideGrid || eagerGrid) && !next.refreshOn && next.lazyLoad !== true)
        next.lazyLoad = false;
      if (!next.searchField) next.searchField = "search_text";
    }
    // Selects nested in a datagrid/editgrid are repeated per row — flag them so
    // descendants follow the same grid eager/lazy decision.
    const childInsideGrid =
      insideGrid || next.type === "datagrid" || next.type === "editgrid";
    if (Array.isArray(next.components)) {
      next.components = enableUrlSelectLabels(next.components, childInsideGrid, eagerGrid);
    }
    if (Array.isArray(next.columns)) {
      next.columns = next.columns.map((col: any) => ({
        ...col,
        components: enableUrlSelectLabels(col.components || [], childInsideGrid, eagerGrid),
      }));
    }
    if (Array.isArray(next.rows)) {
      next.rows = next.rows.map((row: any) =>
        Array.isArray(row)
          ? row.map((cell: any) => ({
              ...cell,
              components: enableUrlSelectLabels(cell.components || [], childInsideGrid, eagerGrid),
            }))
          : row
      );
    }
    return next;
  });
}

// ---------------------------------------------------------------------------
// Normalize the Total / New / Replacement counts and keep the positions array
// in sync with them. Pure function so it can be reused by the plain-React count
// inputs (rendered outside formio to avoid the controlled-input override issue).
// ---------------------------------------------------------------------------
function applyPositionCounts(newData: any, changedKey: string) {
  let total = parseInt(newData.number_of_positions as any);
  if (isNaN(total)) total = 0;
  let newP = parseInt(newData.number_of_new_positions as any);
  if (isNaN(newP)) newP = 0;
  let repP = parseInt(newData.number_of_replacement_positions as any);
  if (isNaN(repP)) repP = 0;

  // 1. Enforce min value bounds to 0
  if (total < 0) total = 0;
  if (newP < 0) newP = 0;
  if (repP < 0) repP = 0;

  // 2. Enforce max value bounds of 100 for Total Position
  if (total > 100) {
    total = 100;
  }

  // 3. Enforce validation according to total position
  if (changedKey === "number_of_positions") {
    if (newP > total) {
      newP = total;
      repP = 0;
    } else if (repP > total) {
      repP = total;
      newP = 0;
    } else {
      repP = Math.max(total - newP, 0);
    }
  } else if (changedKey === "number_of_new_positions") {
    if (newP > total) {
      newP = total;
    }
    repP = Math.max(total - newP, 0);
  } else if (changedKey === "number_of_replacement_positions") {
    if (repP > total) {
      repP = total;
    }
    newP = Math.max(total - repP, 0);
  }

  newData.number_of_positions = total;
  newData.number_of_new_positions = newP;
  newData.number_of_replacement_positions = repP;

  // Sync positions array rows to match new Total
  let currentPositions = newData.positions || [];
  if (currentPositions.length < total) {
    const extra = Array.from(
      { length: total - currentPositions.length },
      (_, i) => ({
        position_number: currentPositions.length + i + 1,
        vacancy_type: "New",
        location: "",
        functional_area: "",
        reporting_manager: "",
        replacement_for: "",
      })
    );
    currentPositions = [...currentPositions, ...extra];
  } else if (currentPositions.length > total) {
    currentPositions = currentPositions.slice(0, total);
  }

  newData.positions = currentPositions.map((pos: any, idx: number) => ({
    ...pos,
    position_number: idx + 1,
    vacancy_type: idx < newP ? "New" : "Replacement",
    ...(idx < newP ? { replacement_for: "" } : {}),
    // Functional Area mirrors the requisition (derived from Designation) in
    // every row — carry the title too so the column shows it, not the id.
    ...(newData.functional_area
      ? {
          functional_area: newData.functional_area,
          functional_area_title:
            newData.functional_area_title || newData.functional_area,
        }
      : {}),
  }));

  return newData;
}

// ---------------------------------------------------------------------------
// Build form.io's `submission.metadata.selectData` from the `_title` fields we
// capture for each url <select>. form.io renders a select's chosen label from
// `root.submission.metadata.selectData[<path>]` WITHOUT a network call; without
// it, a select that only has the stored id renders the raw id on (re)mount and
// then swaps in the label once its remote options load — the id→title flash the
// user sees on tab switch. By feeding this metadata alongside the data, every
// select shows its title immediately and never flashes the id.
//
// Shape mirrors what form.io itself writes:
//   single select : selectData[key]            = { id, value, label }
//   multiple       : selectData[key]            = { <id>: { id, value, label } }
//   datagrid row   : selectData.positions[i].x  = { id, value, label }
// The template object carries both `label` and `id` since some templates render
// "{{ item.label }} ({{ item.id }})".
// ---------------------------------------------------------------------------
const SINGLE_SELECT_TITLE_KEYS: [string, string][] = [
  ["hiring_manager", "hiring_manager_title"],
  ["company", "company_title"],
  ["department", "department_title"],
  ["designation", "designation_title"],
  ["functional_area", "functional_area_title"],
  ["salary_currency", "salary_currency_title"],
  ["employment_type", "employment_type_title"],
  ["location", "location_title"],
  ["preferred_company", "preferred_company_title"],
];
const POSITION_SELECT_TITLE_KEYS: [string, string][] = [
  ["location", "location_title"],
  ["sub_location", "sub_location_title"],
  ["functional_area", "functional_area_title"],
  ["reporting_manager", "reporting_manager_title"],
  ["replacement_for", "replacement_for_title"],
  ["employee_type", "employee_type_title"],
];

function buildSelectData(data: any): Record<string, any> {
  const sd: Record<string, any> = {};
  const opt = (id: any, label: any) => ({ id, value: id, label });

  SINGLE_SELECT_TITLE_KEYS.forEach(([key, titleKey]) => {
    const id = data?.[key];
    const label = data?.[titleKey];
    if (id && label) sd[key] = opt(id, label);
  });

  // Multiple select: Required Skills (keyed by id).
  const skillIds: any[] = Array.isArray(data?.custom_skills)
    ? data.custom_skills
    : typeof data?.custom_skills === "string" && data.custom_skills
    ? data.custom_skills.split(",").map((s: string) => s.trim())
    : [];
  const skillTitles: any[] = Array.isArray(data?.custom_skills_title)
    ? data.custom_skills_title
    : [];
  if (skillIds.length && skillTitles.length) {
    const map: Record<string, any> = {};
    skillIds.forEach((id, i) => {
      if (id) map[id] = opt(id, skillTitles[i] ?? id);
    });
    if (Object.keys(map).length) sd.custom_skills = map;
  }

  // Position datagrid rows.
  const positions: any[] = Array.isArray(data?.positions) ? data.positions : [];
  if (positions.length) {
    sd.positions = positions.map((p: any) => {
      const row: Record<string, any> = {};
      POSITION_SELECT_TITLE_KEYS.forEach(([key, titleKey]) => {
        if (p?.[key] && p?.[titleKey]) row[key] = opt(p[key], p[titleKey]);
      });
      return row;
    });
  }

  return sd;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const RequisitionForm = () => {
  // Backend-driven field configuration. Fetched once on mount; drives the
  // wizard tabs, which fields render, and their label / mandatory / read-only
  // state. Stays null until loaded (and on failure) so the static schema renders
  // unchanged — the form always works even if this endpoint is unavailable.
  const [formConfig, setFormConfig] = useState<FlattenedConfig | null>(null);

  // Wizard steps come from the backend `tabs` (order + names); the trailing
  // Review step is always appended. Falls back to the static steps until the
  // config loads.
  const steps = useMemo(() => {
    const list = buildSteps(formConfig, requisitionSteps as any);
    return [...list, { label: "Review", key: "review" }];
  }, [formConfig]);
  const [currentStep, setCurrentStep] = useState(0);
  const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { data: currentUser } = useCurrentUser();
  // System Manager / Administrator can edit the Hiring Manager (employee) field;
  // for everyone else it stays read-only.
  const canEditEmployeeField = isAdminUser(currentUser ?? null);
  const createJobRequisition = useCreateJobRequisition();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Refetch the Requisition list after create/update. DataListView (fetchFunction
  // mode) nests its list key as [["job-requisitions", <employee>], "pagination",
  // ...], so we wrap the key one level deep for React Query's partial matcher to
  // hit it, and use refetchType: "all" so it refetches even though the list is
  // unmounted while we're on this form.
  const invalidateRequisitionList = () => {
    queryClient.invalidateQueries({
      queryKey: [["job-requisitions"]],
      refetchType: "all",
    });
  };

  // Full-page blocking loader (used while a column copy reflects across rows).
  const loading = useLoadingOverlay();

  // Detect edit mode from navigation state
  const existingRequisition: any | null = (location.state as any)?.requisition ?? null;
  const isEditMode = Boolean(existingRequisition);

  const [formData, setFormData] = useState<JobRequisitionFormData>({
    number_of_positions: 0,
    number_of_new_positions: 0,
    number_of_replacement_positions: 0,
    positions: []
  } as unknown as JobRequisitionFormData);

  const [isUpdating, setIsUpdating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Gate guard for direct navigation to the New Requisition URL (bypassing the
  // "Raise Requisition Request" button check). Editing an existing requisition
  // is always allowed; only NEW creation is gated. The server before_insert
  // hook stays the authoritative block — this is purely for a clean UX.
  useEffect(() => {
    if (isEditMode) return;
    let cancelled = false;
    (async () => {
      const res = await requisitionService.checkCanRaiseRequisition();
      if (!cancelled && !res.allowed) {
        toast.error(
          res.reason || "You are not permitted to raise requisitions.",
          { duration: 6000 }
        );
        navigate("/webapp/recruitment/requisition");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEditMode, navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res: any = await FrappeAPI.callMethod(
          "recruitment.api.job_requisition.get_job_requisition_form_config"
        );
        // callMethod returns response.data.message → { success, message, data }.
        const data: JobRequisitionFormConfig | undefined = res?.data;
        if (!cancelled && data && Array.isArray(data.tabs)) {
          setFormConfig(flattenConfig(data));
        }
      } catch (err) {
        console.error("Failed to load job requisition form config:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Decoupled form.io submission feed (performance) ──────────────────────
  // form.io is uncontrolled: it manages its own field state and reports edits
  // via onChange. Re-feeding `submission={{ data: formData }}` on every render
  // forces form.io to run setSubmission + a full redraw of the step (every
  // datagrid Choices widget), which makes selecting inside the Position Details
  // Table lag. So we keep the submission identity STABLE across form.io-driven
  // changes and only push a fresh submission when WE mutate the data outside
  // form.io (count inputs, bulk vacancy-type toggle, JD preview, edit load) or
  // when the step changes. `formSyncTick` bumps to request such a push.
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  // Employee hover-card support for the Form.io employee <select> inputs.
  // Resolves the selected employee id from the live form data: top-level fields
  // (hiring_manager / hiring_lead) read directly, position-row fields
  // (reporting_manager / replacement_for) read from positions[rowIndex].
  const formContainerRef = useRef<HTMLDivElement | null>(null);
  // Live Form.io instance (via onFormReady) — used to set datagrid cell values
  // in place (fast) instead of re-feeding the whole submission (slow).
  const formInstanceRef = useRef<any>(null);
  const resolveEmployeeId = useCallback(
    (fieldKey: string, rowIndex: number | null): string | undefined => {
      const data: any = formDataRef.current;
      if (rowIndex != null) {
        return data?.positions?.[rowIndex]?.[fieldKey];
      }
      return data?.[fieldKey];
    },
    []
  );
  const [formSyncTick, setFormSyncTick] = useState(0);
  const pushFormSync = useCallback(() => setFormSyncTick((t) => t + 1), []);
  const formSubmission = useMemo(
    () => ({
      data: formDataRef.current,
      // Offline labels so url-selects render titles instantly (no id→title
      // flash on tab switch). Each push to form.io replaces its submission, so
      // we must re-supply this metadata or the accumulated labels are lost.
      metadata: { selectData: buildSelectData(formDataRef.current) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formSyncTick, currentStep]
  );

  const allValidationErrors = useMemo(() => {
    const errors: string[] = [];
    for (let s = 0; s < steps.length - 1; s++) {
      errors.push(...validateStep(steps[s].key, formData, formConfig));
    }
    return errors;
  }, [formData, steps, formConfig]);

  const isStepDisabled = (index: number) => {
    if (index <= currentStep) return false;
    for (let s = 0; s < index; s++) {
      if (validateStep(steps[s].key, formData, formConfig).length > 0) {
        return true;
      }
    }
    return false;
  };

  // Raw draft strings for the Total / New / Replacement number inputs while the
  // user is typing. Keeping the in-progress text here (instead of coercing it to
  // a number on every keystroke) lets the field be emptied/edited freely; the
  // value is normalized into formData on blur.
  const [countDrafts, setCountDrafts] = useState<
    Partial<Record<
      | "number_of_positions"
      | "number_of_new_positions"
      | "number_of_replacement_positions",
      string
    >>
  >({});



  // JD Preview state
  const [jdPreviewOpen, setJdPreviewOpen] = useState(false);
  const [jdContent, setJdContent] = useState<string>("");
  const [jdLoading, setJdLoading] = useState(false);

  // "Preview" popup state. Sends ALL tab data to preview_job_description and
  // renders the returned Job Description (title + html) in the modal. `payload`
  // keeps the exact request body that was sent (shown in a toast + the modal).
  const [jobDetailsPreviewOpen, setJobDetailsPreviewOpen] = useState(false);
  const [jobDetailsPreview, setJobDetailsPreview] = useState<{
    loading: boolean;
    title: string;
    source: string;
    html: string;
    payload: Record<string, any>;
  }>({ loading: false, title: "", source: "", html: "", payload: {} });

  // ── Pre-Screened Candidate CV upload (same pattern as HraExemptio.tsx) ──
  const uploadMutation = useFileUpload();
  const { mutateAsync: deleteDoc } = useDeleteDocument();
  const [candidateFileNames, setCandidateFileNames] = useState<Record<number, string>>({});
  const [candidateFileIds, setCandidateFileIds] = useState<Record<number, string>>({});

  const handleCandidateFileUpload = (index: number, file: File | null) => {
    if (!file) return;
    uploadMutation.mutate(file, {
      onSuccess(data: any) {
        setCandidateFileNames((prev) => ({ ...prev, [index]: file.name }));
        if (data?.name) {
          setCandidateFileIds((prev) => ({ ...prev, [index]: data.name }));
        }
        setFormData((prev: any) => {
          const candidates = [...(prev.custom_pre_screened_candidates || [])];
          if (candidates[index]) {
            candidates[index] = { ...candidates[index], cv: data?.file_url };
          }
          return { ...prev, custom_pre_screened_candidates: candidates };
        });
      },
      onError(err) {
        console.error(err);
        toast.error("File upload failed");
      },
    });
  };

  // ── Bulk set vacancy type across all positions ──
  const setAllVacancyType = (type: "New" | "Replacement") => {
    setFormData((prev: any) => {
      const positions = (prev.positions || []).map((pos: any) => ({
        ...pos,
        vacancy_type: type,
        // Clear stale replacement_for when switching everyone to New
        ...(type === "New" ? { replacement_for: "" } : {}),
      }));
      const total = positions.length;
      return {
        ...prev,
        positions,
        number_of_new_positions: type === "New" ? total : 0,
        number_of_replacement_positions: type === "Replacement" ? total : 0,
      };
    });
    // Mutated positions outside form.io → push the new submission so the grid
    // reflects the bulk vacancy-type change.
    pushFormSync();
  };

  // ── Copy one position column's value (first filled row) into all rows ──
  const copyColumnToAllPositions = useCallback(
    (fieldKey: string) => {
      const positions: any[] = formDataRef.current?.positions || [];
      if (positions.length === 0) return;

      // Source = first row that has a non-empty value in this column.
      let srcVal: any;
      let srcTitle: any;
      let found = false;
      for (const p of positions) {
        const v = p?.[fieldKey];
        if (v !== undefined && v !== null && v !== "") {
          srcVal = v;
          srcTitle = p?.[`${fieldKey}_title`];
          found = true;
          break;
        }
      }
      if (!found) return;

      // Keep React form data (value + title) in sync — does NOT redraw form.io
      // (submission identity unchanged), so it's cheap.
      const syncFormData = () =>
        setFormData((prev: any) => {
          const next = (prev.positions || []).map((p: any) => ({
            ...p,
            [fieldKey]: srcVal,
            ...(srcTitle !== undefined ? { [`${fieldKey}_title`]: srcTitle } : {}),
          }));
          return { ...prev, positions: next };
        });

      // Block the page with a loader while values apply + the grid settles,
      // then reveal the updated form.
      loading?.wrap(async () => {
        // Fast path: set each existing cell value in place on the live form.io
        // instance — updates only the changed cells, no full grid rebuild.
        const dg = formInstanceRef.current?.getComponent?.("positions");
        const rows: any[] = dg?.rows;
        if (dg && Array.isArray(rows) && rows.length > 0) {
          rows.forEach((row: any) => {
            const comp = row?.[fieldKey];
            if (comp && typeof comp.setValue === "function") {
              comp.setValue(srcVal, { modified: false });
            }
          });
          syncFormData();
        } else {
          // Fallback (instance not ready): re-feed submission (slower redraw).
          syncFormData();
          pushFormSync();
        }

        // No reliable "settled" event — wait a couple of frames + a short,
        // row-count-scaled grace period so labels resolve before unblocking.
        await new Promise<void>((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r()))
        );
        await new Promise<void>((r) =>
          setTimeout(r, Math.min(1200, 250 + positions.length * 60))
        );
      }, "Copying to all rows…");
    },
    [loading, pushFormSync]
  );

  // ── Bulk resume upload → one candidate row per uploaded resume ──
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  const handleBulkResumesUploaded = (results: UploadedResume[]) => {
    if (!results.length) return;
    const base = (formDataRef.current?.custom_pre_screened_candidates || []).length;
    const newRows = results.map((r) => ({
      // Seed the candidate name from the file name (sans extension).
      candidate_name: r.fileName.replace(/\.[^.]+$/, ""),
      email: "",
      phone: "",
      cv: r.fileUrl,
      offer_directly: false,
    }));
    setFormData((prev: any) => ({
      ...prev,
      custom_pre_screened_candidates: [
        ...(prev.custom_pre_screened_candidates || []),
        ...newRows,
      ],
    }));
    // Track the file name / id for each new row so the inline column shows the
    // uploaded file and "Remove file" works.
    setCandidateFileNames((m) => {
      const n = { ...m };
      results.forEach((r, i) => {
        n[base + i] = r.fileName;
      });
      return n;
    });
    setCandidateFileIds((m) => {
      const n = { ...m };
      results.forEach((r, i) => {
        if (r.fileId) n[base + i] = r.fileId;
      });
      return n;
    });
    toast.success(
      `${results.length} resume${results.length > 1 ? "s" : ""} uploaded — ${results.length} candidate row${results.length > 1 ? "s" : ""} created`
    );
  };

  // ── Row-level mutations for the custom Pre-Screened Candidates table ──
  const addCandidate = () => {
    setFormData((prev: any) => ({
      ...prev,
      custom_pre_screened_candidates: [
        ...(prev.custom_pre_screened_candidates || []),
        {
          candidate_name: "",
          email: "",
          phone: "",
          cv: "",
          offer_directly: false,
        },
      ],
    }));
  };

  const removeCandidate = (index: number) => {
    setFormData((prev: any) => {
      const candidates = [...(prev.custom_pre_screened_candidates || [])];
      candidates.splice(index, 1);
      return { ...prev, custom_pre_screened_candidates: candidates };
    });
    // Drop tracked filename / file id for that row and shift higher indices down
    const shift = (m: Record<number, string>) => {
      const next: Record<number, string> = {};
      Object.entries(m).forEach(([k, v]) => {
        const i = Number(k);
        if (i < index) next[i] = v;
        else if (i > index) next[i - 1] = v;
      });
      return next;
    };
    setCandidateFileNames((prev) => shift(prev));
    setCandidateFileIds((prev) => shift(prev));
  };

  const updateCandidateField = (index: number, field: string, value: any) => {
    setFormData((prev: any) => {
      const candidates = [...(prev.custom_pre_screened_candidates || [])];
      if (!candidates[index]) return prev;
      candidates[index] = { ...candidates[index], [field]: value };
      return { ...prev, custom_pre_screened_candidates: candidates };
    });
  };

  const handleCandidateRemoveFile = async (index: number) => {
    const fileId = candidateFileIds[index];
    const clearCv = () => {
      setCandidateFileNames((prev) => {
        const n = { ...prev };
        delete n[index];
        return n;
      });
      setCandidateFileIds((prev) => {
        const n = { ...prev };
        delete n[index];
        return n;
      });
      setFormData((prev: any) => {
        const candidates = [...(prev.custom_pre_screened_candidates || [])];
        if (candidates[index]) {
          candidates[index] = { ...candidates[index], cv: "" };
        }
        return { ...prev, custom_pre_screened_candidates: candidates };
      });
    };

    if (!fileId) {
      clearCv();
      return;
    }
    if (!window.confirm("Delete this file?")) return;
    try {
      await deleteDoc({ doctype: "File", name: fileId });
      clearCv();
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    }
  };

  // Pre-populate for edit mode.
  // The object passed via navigation state is the trimmed list-view row, so it
  // is missing most fields. Seed the form from it immediately (so the form is
  // not blank while loading), then fetch the COMPLETE requisition by name and
  // re-map it so every field is populated on edit.
  useEffect(() => {
    if (!isEditMode || !existingRequisition) return;

    setFormData(mapRequisitionToFormData(existingRequisition) as JobRequisitionFormData);
    pushFormSync();

    const reqName = existingRequisition.name;
    if (!reqName) return;

    let cancelled = false;
    (async () => {
      try {
        const res: any = await FrappeAPI.callMethod(
          "recruitment.api.job_requisition.get_job_requisition",
          { name: reqName }
        );
        // callMethod unwraps response.data.message → { success, message, data }
        const full = res?.data ?? res;
        if (!cancelled && full && typeof full === "object") {
          setFormData(mapRequisitionToFormData(full) as JobRequisitionFormData);
          pushFormSync();
        }
      } catch (err) {
        console.error("Failed to fetch full requisition for edit:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [existingRequisition, isEditMode]);

  // Recruitment Start Date default: today on create. Edit mode is seeded from
  // the API's posting_date in mapRequisitionToFormData, so only set this when
  // creating and the field is still empty.
  useEffect(() => {
    if (!isEditMode && !formData.recruitment_start_date) {
      const today = new Date().toISOString().split("T")[0];
      setFormData((prev: any) => ({ ...prev, recruitment_start_date: today }));
      pushFormSync();
    }
  }, [isEditMode, formData.recruitment_start_date, pushFormSync]);

  // Set only Hiring Manager + Company defaults from the logged-in employee.
  // Department / Designation / Functional Area are NOT auto-filled — the user
  // selects them via the cascading dropdowns (department→designation→functional area).
  useEffect(() => {
    if (currentEmployee?.name && !isEditMode && !formData.hiring_manager) {
      setFormData((prev: any) => ({
        ...prev,
        hiring_manager: currentEmployee.name,
        company: currentEmployee.company,
      }));
      pushFormSync();
    }
  }, [currentEmployee, isEditMode, formData.hiring_manager]);


  // ---------------------------------------------------------------------------
  // JD Preview handler
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // JD Preview handler (FIXED to match API response structure)
  // ---------------------------------------------------------------------------
  const handlePreviewJD = async () => {
    // Send the human-readable titles (not the link ids) to the preview API.
    const designation = (formData as any).designation_title || (formData as any).designation;
    const department = (formData as any).department_title || (formData as any).department;

    if (!designation || !department) {
      toast.error("Please select both Designation and Department first.");
      return;
    }

    setJdLoading(true);
    setJdPreviewOpen(true);
    setJdContent("");

    try {
      const message: any = await FrappeAPI.callMethod(
        "recruitment.api.job_requisition.preview_job_description",
        {
          designation,
          department,
          fields: ["name", "description", "designation", "department"],
          limit: 1,
        }
      );

      // FrappeAPI.callMethod already unwraps response.data.message
      const jdData = message?.data || message?.[0] || message;

      // Extract the HTML string from description_html (fallback to description if needed)
      const htmlContent = jdData?.description_html || jdData?.description;

      if (htmlContent) {
        setJdContent(htmlContent);
      } else {
        setJdContent(
          `<p style="color:#6b7280;text-align:center;padding:32px 0;">
            No job description found for <strong>${designation}</strong> in 
            <strong>${department}</strong>.
          </p>`
        );
      }
    } catch (err) {
      console.error("Error fetching JD:", err);

      setJdContent(
        `<p style="color:#ef4444;text-align:center;padding:32px 0;">
          Failed to load job description. Please try again.
        </p>`
      );
    } finally {
      setJdLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // "Preview" — collects ALL tab data (via buildPayload), POSTs it to
  // preview_job_description, and renders the returned Job Description in the
  // modal. The request body shape is:
  //   { designation, department, functional_area, data: <all-tab payload> }
  // ---------------------------------------------------------------------------
  const handlePreviewJobDetails = async () => {
    // Send the human-readable titles (not the link ids) to the preview API.
    const designation = (formData as any).designation_title || (formData as any).designation;
    const department = (formData as any).department_title || (formData as any).department;
    const functional_area =
      (formData as any).functional_area_title || (formData as any).functional_area;

    if (!designation || !department) {
      toast.error("Please select Designation and Department first.");
      return;
    }

    // Escape values that get interpolated into the dangerouslySetInnerHTML
    // string below, to avoid XSS / render issues from special characters.
    const escapeHtml = (s: any) =>
      String(s).replace(
        /[&<>"']/g,
        (c) =>
          ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
      );

    // Whole-form payload — every tab's data — sent under `data`.
    const payload = buildPayload(formData);
    const requestBody = { designation, department, functional_area, data: payload };

    setJobDetailsPreview({ loading: true, title: "", source: "", html: "", payload: requestBody });
    setJobDetailsPreviewOpen(true);

    // Surface the exact payload being sent in a toast.

    try {
      // callMethod posts the body as JSON and unwraps response.data.message →
      // { success, message, data }.
      const res: any = await FrappeAPI.callMethod(
        "recruitment.api.job_requisition.preview_job_description",
        requestBody
      );

      const jd = res?.data ?? res ?? {};
      const html = jd?.description_html || jd?.description || "";
      const skills = Array.isArray(jd?.skills) ? jd.skills : undefined;
      // A "default"/"match" JD still carries html even when matched === false —
      // only treat it as missing when source is "none" or there's no html.
      const noJd = jd?.source === "none" || !html;

      setJobDetailsPreview((prev) => ({
        ...prev,
        loading: false,
        title: jd?.title || jd?.name || "",
        source: jd?.source || "",
        html: noJd
          ? `<p style="color:#6b7280;text-align:center;padding:32px 0;">
              No job description found for <strong>${escapeHtml(designation)}</strong> in
              <strong>${escapeHtml(department)}</strong>.
            </p>`
          : html,
      }));

      // Persist the previewed JD into the form so the final submit/update sends
      // the same html in `description` + `custom_job_description_template`.
      // Do NOT overwrite `custom_skills` the user already filled — only seed it
      // from the preview when the user hasn't entered any skills yet, so opening
      // the Preview never resets the skills field.
      if (!noJd) {
        setFormData((prev: any) => {
          const userHasSkills =
            prev.custom_skills !== undefined &&
            prev.custom_skills !== null &&
            prev.custom_skills !== "" &&
            !(Array.isArray(prev.custom_skills) && prev.custom_skills.length === 0);
          return {
            ...prev,
            description: html,
            job_description_template: html,
            ...(skills && !userHasSkills ? { custom_skills: skills } : {}),
          };
        });
        // Seeded skills/description into the form → push so the form.io fields
        // (e.g. the Required Skills select) show the previewed values.
        pushFormSync();
      }
    } catch (err) {
      console.error("Error fetching job description preview:", err);
      setJobDetailsPreview((prev) => ({
        ...prev,
        loading: false,
        html: `<p style="color:#ef4444;text-align:center;padding:32px 0;">
            Failed to load job description preview. Please try again.
          </p>`,
      }));
    }
  };

  const handleNext = () => {
    const errors = validateStep(steps[currentStep].key, formData, formConfig);
    if (errors.length > 0) {
      setValidationErrors(errors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setValidationErrors([]);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setValidationErrors([]);
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (index: number) => {
    if (index === currentStep) return;

    if (index < currentStep) {
      setValidationErrors([]);
      setCurrentStep(index);
      return;
    }

    // Moving forward: validate every intermediate step
    const allErrors: string[] = [];
    for (let s = currentStep; s < index; s++) {
      allErrors.push(...validateStep(steps[s].key, formData, formConfig));
    }

    if (allErrors.length > 0) {
      setValidationErrors(allErrors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setValidationErrors([]);
    setCurrentStep(index);
  };

  type CountKey =
    | "number_of_positions"
    | "number_of_new_positions"
    | "number_of_replacement_positions";

  // While typing, just hold the raw text so the field can be emptied/edited
  // freely without being coerced to a number on every keystroke.
  const handlePositionCountChange = (changedKey: CountKey, rawValue: string) => {
    setCountDrafts((prev) => ({ ...prev, [changedKey]: rawValue }));
  };

  // On blur, normalize the typed value into formData and rebuild the positions
  // array, then drop the draft so the input reflects the normalized number.
  const commitPositionCount = (changedKey: CountKey) => {
    const draft = countDrafts[changedKey];
    if (draft === undefined) return;
    setFormData((prev: any) =>
      applyPositionCounts({ ...prev, [changedKey]: draft }, changedKey)
    );
    // Rows were added/removed/retyped outside form.io → push so the datagrid
    // rebuilds with the new row set.
    pushFormSync();
    setCountDrafts((prev) => {
      const next = { ...prev };
      delete next[changedKey];
      return next;
    });
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  // Display the in-progress draft while editing, otherwise the normalized value.
  const positionCountValue = (changedKey: CountKey): string => {
    const draft = countDrafts[changedKey];
    if (draft !== undefined) return draft;
    const val = (formData as any)[changedKey];
    return val === undefined || val === null ? "" : String(val);
  };

  // #1 Functional Area auto-fetch: a Designation links to exactly one Functional
  // Area (Designation.custom_functional_area). When the user picks a designation,
  // pull that linked Functional Area and populate the field automatically, keeping
  // it in sync with the selected designation.
  const autoFillFunctionalArea = useCallback(
    async (designation: string) => {
      try {
        // Functional Area is taken straight from the Designation record (the
        // Designation doctype already stores it in `custom_functional_area`).
        const desigRes: any = await FrappeAPI.callMethod("frappe.client.get_value", {
          doctype: "Designation",
          filters: designation,
          fieldname: "custom_functional_area",
        });
        // When the designation has no functional area, faId is "" — we still
        // fall through to clear any stale value from the previous designation.
        const faId: string = desigRes?.custom_functional_area || "";
        // Resolve the human-readable title (functional_area_name) via the form's
        // standard field-options endpoint so the field shows the TITLE, not the
        // id. `include` guarantees the linked id is in the results.
        let faTitle = faId;
        if (faId) {
          try {
            const opts: any = await FrappeAPI.callMethod(
              "recruitment.api.job_requisition.get_link_field_options",
              { doctype: "Functional Area", include: faId, limit: 1 }
            );
            const match = (opts?.results || []).find((r: any) => r.id === faId);
            if (match?.label) faTitle = match.label;
          } catch {
            /* fall back to the id as the label */
          }
        }
        setFormData((prev: any) => {
          if (prev.designation !== designation) return prev; // designation moved on
          // Mirror the derived Functional Area into every position row so all
          // rows stay in sync with the requisition's designation (clearing the
          // title when there is no functional area).
          const positions = Array.isArray(prev.positions)
            ? prev.positions.map((p: any) => {
                const updated = { ...p, functional_area: faId };
                if (faTitle) updated.functional_area_title = faTitle;
                else delete updated.functional_area_title;
                return updated;
              })
            : prev.positions;
          if (prev.functional_area === faId && positions === prev.positions) {
            return prev;
          }
          const next: any = { ...prev, functional_area: faId, positions };
          if (faTitle) next.functional_area_title = faTitle;
          else delete next.functional_area_title;
          return next;
        });
        pushFormSync();
      } catch (e) {
        console.error("Functional area auto-fetch failed", e);
      }
    },
    [pushFormSync]
  );

  const handleChange = (changed: { data: any; changed?: { component?: { key?: string }; value?: any }; metadata?: any }) => {
    const newData = { ...formData, ...changed.data };

    // When the user changes the Designation, auto-populate the Functional Area
    // from the designation's linked value (and clear it when designation clears).
    const changedKey = changed.changed?.component?.key;
    if (changedKey === "designation") {
      if (newData.designation) {
        void autoFillFunctionalArea(newData.designation);
      } else {
        newData.functional_area = "";
        delete newData.functional_area_title;
      }
    }

    // Capture the human-readable label of each url/link <select> alongside its
    // stored id, so the Review tab (and the preview payload) can show the title
    // instead of the raw id. form.io reports the selected option objects in
    // `metadata.selectData`, mirroring the data nesting (top-level keys + the
    // `positions` datagrid rows). We persist them as `${key}_title` fields.
    const selectData = (changed as any).metadata?.selectData;
    if (selectData && typeof selectData === "object") {
      const labelOf = (v: any) =>
        v && typeof v === "object" ? (v.label ?? v.name ?? v.title) : undefined;

      Object.keys(selectData).forEach((key) => {
        const sd = selectData[key];
        if (key === "positions" && Array.isArray(sd)) {
          // Per-row position titles (location, functional_area, etc.)
          const rows = [...(newData.positions || [])];
          sd.forEach((rowSel: any, idx: number) => {
            if (!rows[idx] || !rowSel || typeof rowSel !== "object") return;
            let updated = { ...rows[idx] };
            Object.keys(rowSel).forEach((fk) => {
              const lbl = labelOf(rowSel[fk]);
              if (lbl) {
                updated = { ...updated, [`${fk}_title`]: lbl };
              } else {
                delete updated[`${fk}_title`];
              }
            });
            rows[idx] = updated;
          });
          newData.positions = rows;
        } else if (Array.isArray(sd)) {
          // Multiple select (e.g. custom_skills) → array of labels.
          const labels = sd.map((v: any) => labelOf(v)).filter(Boolean);
          if (labels.length) {
            newData[`${key}_title`] = labels;
          } else {
            delete newData[`${key}_title`];
          }
        } else if (
          sd &&
          typeof sd === "object" &&
          !("label" in sd || "name" in sd || "title" in sd)
        ) {
          // Multiple select stored as an object map: { <id>: { id, value, label } }
          const labels = Object.values(sd)
            .map((v: any) => labelOf(v))
            .filter(Boolean);
          if (labels.length) {
            newData[`${key}_title`] = labels;
          } else {
            delete newData[`${key}_title`];
          }
        } else {
          const lbl = labelOf(sd);
          if (lbl) {
            newData[`${key}_title`] = lbl;
          } else {
            delete newData[`${key}_title`];
          }
        }
      });
    }

    // A Sub Location belongs to one specific Location within a Position row.
    // Form.io's `clearOnRefresh` handles this in the widget, but clear the
    // submitted state too so a previously-selected Sub Location can never be
    // sent after its parent Location changes.
    let positionLocationChanged = false;
    if (Array.isArray(newData.positions)) {
      newData.positions = newData.positions.map((pos: any, idx: number) => {
        const previousLocation = (formData as any).positions?.[idx]?.location;
        if (previousLocation === pos.location) return pos;
        positionLocationChanged = true;
        const updated = { ...pos, sub_location: "" };
        delete updated.sub_location_title;
        return updated;
      });
    }

    // Drop stale `_title` fields when their select was cleared, so the Review
    // step falls back to the empty state instead of showing an old title.
    SINGLE_SELECT_TITLE_KEYS.forEach(([key, titleKey]) => {
      if (!newData[key]) delete newData[titleKey];
    });
    if (Array.isArray(newData.positions)) {
      newData.positions = newData.positions.map((pos: any) => {
        const updated = { ...pos };
        POSITION_SELECT_TITLE_KEYS.forEach(([key, titleKey]) => {
          if (!updated[key]) delete updated[titleKey];
        });
        // Functional Area is auto-derived from the requisition designation, so
        // every row mirrors the top-level id AND its title (so the column shows
        // the title, not the id — including newly-added rows).
        if (newData.functional_area) {
          updated.functional_area = newData.functional_area;
          updated.functional_area_title =
            newData.functional_area_title || newData.functional_area;
        } else {
          updated.functional_area = "";
          delete updated.functional_area_title;
        }
        return updated;
      });
    }

    // If a row in the positions datagrid changed directly, sync totals to the
    // Total / New / Replacement counts so the summary inputs stay accurate.
    const positions = newData.positions || [];
    const actualNew = positions.filter((p: any) => p.vacancy_type === "New").length;
    const actualRep = positions.filter((p: any) => p.vacancy_type === "Replacement").length;
    const actualTotal = positions.length;

    const total = parseInt(newData.number_of_positions as any) || 0;
    const newP = parseInt(newData.number_of_new_positions as any) || 0;
    const repP = parseInt(newData.number_of_replacement_positions as any) || 0;

    if (total !== actualTotal || newP !== actualNew || repP !== actualRep) {
      newData.number_of_positions = actualTotal;
      newData.number_of_new_positions = actualNew;
      newData.number_of_replacement_positions = actualRep;
    }

    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }

    setFormData(newData);
    // form.io is intentionally uncontrolled for grid performance. A location
    // change is the exception: re-feed this one update so its internal select
    // value/options cannot keep showing the old Sub Location.
    if (positionLocationChanged) pushFormSync();
  };

  // ---------------------------------------------------------------------------
  // buildPayload — now includes custom_attachment_url
  // ---------------------------------------------------------------------------
  const buildPayload = (finalData: any): CreateJobRequisitionPayload => {
    let custom_work_experience: string | undefined = undefined;
    let custom_work_experience_range: string | undefined = undefined;

    const expVal = finalData.custom_work_experience_range;
    if (expVal === "Fresher") {
      custom_work_experience = "Fresher";
    } else if (expVal === "1 - 3 Years") {
      custom_work_experience = "1 - 3 Years";
      custom_work_experience_range = "1 - 3 years";
    } else if (expVal === "4 - 5 Years") {
      custom_work_experience = "4 - 5 years";
      custom_work_experience_range = "3 - 5 years";
    } else if (expVal === "5 - 10 Years") {
      custom_work_experience = "5 - 10 years";
      custom_work_experience_range = "5 - 10 years";
    }

    // Child-group columns the backend declares for a position that aren't
    // already mapped by hand below — so a newly-added Position column is sent.
    const extraPositionKeys = dynamicChildGroupFieldnames(
      formConfig,
      "custom_position_details",
      [
        "vacancy_type",
        "location",
        "sub_location",
        "reporting_manager",
        "functional_area",
        "replacement_for",
        "cost_center_allocations",
      ]
    );

    const payload: CreateJobRequisitionPayload = {
      // Requisition name (e.g. "HR-HIREQ-00013") — dynamic; present on edit.
      job_title: finalData.name || existingRequisition?.name,
      // Source is always "Refer" for this form.
      source: "Refer",
      requested_by:
        finalData.hiring_manager ||
        existingRequisition?.requested_by ||
        currentEmployee?.employee ||
        currentEmployee?.name,
      company: finalData.company,
      department: finalData.department,
      designation: finalData.designation,
      requested_by_designation: finalData.designation,
      custom_functional_area: finalData.functional_area,
      custom_experience_range_from: finalData.experience_from?.toString(),
      custom_experience_range_to: finalData.experience_to?.toString(),
      custom_experience_unit: finalData.experience_unit,
      custom_hiring_lead: finalData.hiring_lead,
      custom_salary_range_currency: finalData.salary_currency,
      custom_salary_range_min: finalData.salary_min,
      custom_salary_range_max: finalData.salary_max,
      custom_salary_timeframe: finalData.salary_timeframe,
      posting_date: toBackendDate(finalData.recruitment_start_date),
      requested_by_dept: finalData.department,
      custom_type_of_position: (finalData.positions || [])[0]?.vacancy_type || "New",
      no_of_positions: finalData.number_of_positions || (finalData.positions || []).length || 1,
      custom_division: finalData.custom_division,
      status: finalData.status,
      expected_compensation: finalData.expected_compensation
        ? Number(finalData.expected_compensation)
        : undefined,
      expected_by: finalData.expected_by
        ? toBackendDate(finalData.expected_by)
        : undefined,
      custom_employment_type: ["Full Time", "Part Time", "Contract", "Intern", "Freelance"].includes(
        finalData.employment_type || ""
      )
        ? finalData.employment_type
        : undefined,
      custom_employment_type_link: finalData.employment_type,
      custom__employee_type: finalData.custom_employee_type,
      custom_location: finalData.location,
      custom_work_experience,
      custom_work_experience_range,
      custom_preferred_notice_period: finalData.custom_preferred_notice_period,
      custom_preferred_company: finalData.preferred_company,
      custom_other_preferred_companies: finalData.custom_other_preferred_companies,
      custom_additional_roles__responsibilities: finalData.additional_roles_responsibilities,
      custom_additional_skills: finalData.additional_skills,
      custom_comments__instructions: finalData.comments_instructions,
      custom_cost_centre: finalData.cost_centre,
      custom_designation_change: finalData.designation_change,
      custom_qualifications: finalData.custom_qualifications,
      custom_job_description_template: finalData.job_description_template,
      description: finalData.description,
      reason_for_requesting: finalData.reason_for_requesting,
      custom_skills: finalData.custom_skills,
      custom_assign_to_recruiter: finalData.custom_assign_to_recruiter,
      custom_pre_screened_candidates: (
        finalData.custom_pre_screened_candidates || []
      ).map((candidate: any) => ({
        candidate_name: candidate.candidate_name,
        email: candidate.email,
        phone: candidate.phone,
        offer_directly: candidate.offer_directly,

        // 👇 CV URL
        cv:
          candidate.cv?.[0]?.url ||
          candidate.cv?.[0]?.storage ||
          candidate.cv ||
          "",
      })),
      custom_position_details: (finalData.positions || []).map((pos: any) => {
        const row: any = {
          vacancy_type: pos.vacancy_type || "New",
          location: pos.location,
          sub_location: pos.sub_location,
          reporting_manager: pos.reporting_manager,
          functional_area: pos.functional_area,
          replacement_for:
            pos.vacancy_type === "Replacement" ? pos.replacement_for : undefined,
        };
        // Only send the Cost Center Allocations child table when the backend
        // config actually includes that column. When it's hidden (omitted under
        // `restrict`), the backend field isn't a table and rejects a list with
        // "Value for Cost Center Allocations cannot be a list".
        if (
          childGateApplies(
            "custom_position_details",
            "cost_center_allocations",
            formConfig
          )
        ) {
          row.cost_center_allocations = (pos.cost_center_allocations || []).map(
            (a: any) => ({
              cost_center: a.cost_center,
              percentage: a.percentage,
            })
          );
        }
        // Merge any backend-declared Position column we don't map by hand.
        extraPositionKeys.forEach((k) => {
          if (pos[k] !== undefined) row[k] = pos[k];
        });
        return row;
      }),
      // ── Attachment URL (uploaded via useFileUpload, same as Invoice.tsx) ──
    };

    // Extend the payload with dynamic / newly-added backend TAB fields (keyed by
    // their backend fieldname), filling only keys the hardcoded mapping above
    // left empty — so known, specially-formatted fields always win.
    mergeDynamicValues(payload, collectDynamicTabValues(formConfig, finalData));

    return payload;
  };



  const handleSubmit = async (submission: any) => {
    const finalData = { ...formData, ...submission.data };
    const payload = buildPayload(finalData);

    if (isEditMode) {
      setIsUpdating(true);
      try {
        await FrappeAPI.callMethod(
          "recruitment.api.job_requisition.update_job_requisition",
          {
            name: existingRequisition.name,
            payload,
          }
        );
        toast.success("Requisition updated successfully!");
        invalidateRequisitionList();
        navigate("/webapp/recruitment/requisition");
      } catch (error: any) {
        console.error("Error updating job requisition:", error);
        toast.error(error?.message || "Failed to  update requisition. Please try again.");
      } finally {
        setIsUpdating(false);
      }
    } else {
      try {
        await createJobRequisition.mutateAsync(payload);
        toast.success("Job requisition created successfully!");
        invalidateRequisitionList();
        navigate("/webapp/recruitment/requisition");
      } catch (error) {
        console.error("Error  creating job requisition:", error);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Submit button flow: FIRST call preview_job_description (silently — no modal),
  // capture its JD html/skills, THEN run the final submit with those merged in.
  // Single button, single click. The Preview button keeps its own modal flow
  // (handlePreviewJobDetails) — this one never opens the modal.
  // ---------------------------------------------------------------------------
  const handleSubmitWithPreview = async () => {
    // Validate every step before submitting — a user can jump straight to the
    // last step via the tabs and otherwise submit with missing/invalid fields
    // from earlier steps. Stop at the first invalid step and surface its errors.
    // Iterate all steps except the trailing Review step.
    for (let step = 0; step < steps.length - 1; step++) {
      const errors = validateStep(steps[step].key, formData, formConfig);
      if (errors.length > 0) {
        setValidationErrors(errors);
        setCurrentStep(step);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    setValidationErrors([]);

    let jdFields: Record<string, any> = {};

    try {
      // Send the human-readable titles (not the link ids) to the preview API.
      const designation = (formData as any).designation_title || (formData as any).designation;
      const department = (formData as any).department_title || (formData as any).department;
      const functional_area =
        (formData as any).functional_area_title || (formData as any).functional_area;

      if (designation && department) {
        const payload = buildPayload(formData);
        const requestBody = { designation, department, functional_area, data: payload };

        const res: any = await FrappeAPI.callMethod(
          "recruitment.api.job_requisition.preview_job_description",
          requestBody
        );

        const jd = res?.data ?? res ?? {};
        const html = jd?.description_html || jd?.description || "";
        const skills = Array.isArray(jd?.skills) ? jd.skills : undefined;
        const noJd = jd?.source === "none" || !html;

        if (!noJd) {
          jdFields = {
            description: html,
            job_description_template: html,
            ...(skills ? { custom_skills: skills } : {}),
          };
          // Keep the form state in sync too (does NOT open the preview modal).
          setFormData((prev: any) => ({ ...prev, ...jdFields }));
        }
      }
    } catch (err) {
      // Don't block submit if the preview call fails — just submit as-is.
      console.error("Preview before submit failed:", err);
    }

    // Final submit with the previewed JD fields merged over the current form data.
    await handleSubmit({ data: jdFields });
  };

  // Eager-load the position-grid url-selects (so saved ids render as titles)
  // only when the grid is small enough that per-row loads won't freeze the page.
  const positionRowCount = ((formData as any).positions || []).length;
  const eagerGrid = positionRowCount > 0 && positionRowCount <= 25;

  const currentSchema = useMemo(() => {
    const activeKey = steps[currentStep]?.key;
    if (!activeKey || activeKey === "review") {
      return { components: [] };
    }

    // Brand-new backend tab (no static schema) → generate its fields from the
    // config and render them directly.
    if (isDynamicStepKey(activeKey)) {
      const components = formConfig
        ? buildDynamicTabComponents(activeKey, formConfig)
        : [];
      return { components: enableUrlSelectLabels(components, false, eagerGrid) };
    }

    const stepKey = activeKey as FormSchemaKeys;
    const schema = requisitionFormSchemas[stepKey];
    // Defensive: a known tab key with no static schema → nothing to render.
    if (!schema) return { components: [] };

    let components = schema.components as any[];

    // Backend-driven control: hide fields the backend omits, override
    // label / mandatory / read-only, and append any brand-new backend fields.
    // No-op until the config loads (and on failure), so the static layout is
    // the fallback.
    components = applyDynamicConfig(stepKey, components, formConfig);

    // Basic Details: the Hiring Manager (employee) field is editable only for
    // System Manager / Administrator; read-only for everyone else.
    if (stepKey === "basicDetails") {
      components = components.map((c) =>
        c.key === "hiring_manager"
          ? { ...c, disabled: !canEditEmployeeField }
          : c
      );
    }

    return { ...schema, components: enableUrlSelectLabels(components, false, eagerGrid) };
  }, [currentStep, steps, canEditEmployeeField, eagerGrid, formConfig]);

  const isBusy = isUpdating || createJobRequisition.isPending;
  const canPreviewJD = !!(formData as any).designation && !!(formData as any).department;

  // Stable key of the active step (drives per-step UI that used to key off a
  // fixed numeric index, now that the tab order is backend-driven).
  const activeKey = steps[currentStep]?.key ?? "";

  // Last step = "Review"
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 bg-white rounded-lg shadow">
      {/* Close button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 px-3 py-2 border rounded-md hover:bg-gray-100 transition"
        >
          <X />
        </button>
      </div>

      {/* Edit mode banner */}
      {isEditMode && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm">
          <span className="text-base text-gray-500"><Edit /></span>
          <span>
            Editing requisition{" "}
            <span className="font-semibold">{existingRequisition.name}</span>
            {" — "}{existingRequisition.designation_title}, {existingRequisition.department_title}
          </span>
        </div>
      )}

      {/* Validation error banner */}
      {validationErrors.length > 0 && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-300 text-red-700 text-sm">
          <p className="font-semibold mb-1">Please fill in all required fields before proceeding:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Step tabs */}
      <div className="mb-8 border-b overflow-x-auto scrollbar-hide">
        <div className="flex min-w-max md:min-w-0">
          {steps.map((step, index) => {
            const disabled = isStepDisabled(index);
            return (
              <div
                key={step.key}
                className={`flex-1 min-w-[140px] md:min-w-0 text-center pb-4 px-2 whitespace-nowrap transition-colors ${
                  index === currentStep
                    ? "text-primary-500 border-b-2 border-primary-500 font-semibold"
                    : disabled
                    ? "text-gray-300 cursor-not-allowed opacity-60"
                    : "text-gray-500 cursor-pointer hover:text-gray-700"
                }`}
                onClick={() => {
                  if (!disabled) {
                    handleStepClick(index);
                  } else {
                    // Triggers validation messages for visual feedback
                    const allErrors: string[] = [];
                    for (let s = 0; s < index; s++) {
                      allErrors.push(...validateStep(steps[s].key, formData, formConfig));
                    }
                    setValidationErrors(allErrors);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
              >
                {step.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-semibold">
            {steps[currentStep].label}
          </h2>
          {/* Preview JD button — only on Job Details step (index 1) */}
          {currentStep === 11 && (
            <button
              onClick={handlePreviewJD}
              disabled={!canPreviewJD}
              title={canPreviewJD ? "Preview Job Description" : "Select Designation and Department first"}
              className={`flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition ${canPreviewJD
                ? "border-indigo-500 text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                : "border-gray-300 text-gray-400 cursor-not-allowed opacity-60"
                }`}
            >
              <FileText size={16} />
              Preview JD
            </button>
          )}
        </div>

        {steps[currentStep].key === "review" ? (
          <RequisitionReviewStep
            formData={formData}
            formConfig={formConfig}
            onSubmit={() => handleSubmit({ data: formData })}
            onBack={handlePrevious}
            submitPending={isBusy}
            isEditMode={isEditMode}
            validationErrors={allValidationErrors}
          />
        ) : (
          <>
            {/* ── Position counts (plain React inputs, kept out of formio to avoid
                 the controlled-input override issue) ── */}
            {activeKey === "positionSelection" && (
              <div className="mb-4 border rounded-md p-4">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Position <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={positionCountValue("number_of_positions")}
                    onChange={(e) =>
                      handlePositionCountChange("number_of_positions", e.target.value)
                    }
                    onBlur={() => commitPositionCount("number_of_positions")}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    (Max Allowed Positions per Requisition is 100)
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={positionCountValue("number_of_new_positions")}
                      onChange={(e) =>
                        handlePositionCountChange("number_of_new_positions", e.target.value)
                      }
                      onBlur={() => commitPositionCount("number_of_new_positions")}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Replacement
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={positionCountValue("number_of_replacement_positions")}
                      onChange={(e) =>
                        handlePositionCountChange(
                          "number_of_replacement_positions",
                          e.target.value
                        )
                      }
                      onBlur={() => commitPositionCount("number_of_replacement_positions")}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={formContainerRef} className="relative">
              <Form
                form={currentSchema}
                submission={formSubmission}
                onChange={handleChange}
                onSubmit={handleSubmit}
                onFormReady={(instance: any) => {
                  formInstanceRef.current = instance;
                }}
              />
              {/* Employee hover cards over the Form.io employee select inputs */}
              <FormEmployeeHoverLayer
                containerRef={formContainerRef}
                resolveEmployeeId={resolveEmployeeId}
              />
              {/* Per-column "copy to all rows" buttons in the Position table */}
              {activeKey === "positionSelection" && (
                <PositionColumnCopyButtons
                  containerRef={formContainerRef}
                  onCopyColumn={copyColumnToAllPositions}
                />
              )}
            </div>

            {/* ── Position Selection summary bar (totals + bulk vacancy-type toggle) ── */}
            {activeKey === "positionSelection" && (() => {
              const positions: any[] = (formData as any).positions || [];
              const total = positions.length;
              const newCount = positions.filter((p) => p?.vacancy_type === "New").length;
              const replacementCount = positions.filter(
                (p) => p?.vacancy_type === "Replacement"
              ).length;
              return (
                <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-2 border rounded-md bg-gray-50 text-sm">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-semibold text-gray-800">
                      {total} Total positions
                    </span>
                    <span className="flex items-center gap-1 text-gray-700">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span className="font-semibold">{newCount}</span>
                      <span className="text-gray-500">New</span>
                    </span>
                    <span className="flex items-center gap-1 text-gray-700">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      <span className="font-semibold">{replacementCount}</span>
                      <span className="text-gray-500">Replacement</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-500 text-xs uppercase tracking-wide">
                      Set all to
                    </span>
                    <button
                      type="button"
                      onClick={() => setAllVacancyType("New")}
                      disabled={total === 0}
                      className="flex items-center gap-1 px-3 py-1 border border-green-500 text-green-700 rounded-lg text-xs hover:bg-green-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      New
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllVacancyType("Replacement")}
                      disabled={total === 0}
                      className="flex items-center gap-1 px-3 py-1 border border-orange-500 text-orange-700 rounded-lg text-xs hover:bg-orange-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      Replacement
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ── Pre-Screened Candidates (custom table with inline Attachment column) ── */}
            {activeKey === "otherDetails" && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pre-Screened Candidates
                </label>
                <div className="overflow-x-auto border rounded-md">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        <th className="text-left font-medium px-3 py-2 border-b">Candidate Name</th>
                        <th className="text-left font-medium px-3 py-2 border-b">Email</th>
                        <th className="text-left font-medium px-3 py-2 border-b">Phone</th>
                        <th className="text-left font-medium px-3 py-2 border-b">Attachment</th>
                        <th className="text-left font-medium px-3 py-2 border-b">Offer Directly?</th>
                        <th className="px-3 py-2 border-b w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {((formData as any).custom_pre_screened_candidates || []).length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center text-gray-400 px-3 py-4">
                            No candidates added yet.
                          </td>
                        </tr>
                      )}
                      {((formData as any).custom_pre_screened_candidates || []).map(
                        (candidate: any, index: number) => (
                          <tr key={index} className="border-b last:border-b-0 align-top">
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={candidate?.candidate_name || ""}
                                onChange={(e) =>
                                  updateCandidateField(index, "candidate_name", e.target.value)
                                }
                                placeholder="e.g., Maya Krishnan"
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="email"
                                value={candidate?.email || ""}
                                onChange={(e) =>
                                  updateCandidateField(index, "email", e.target.value)
                                }
                                placeholder="e.g., candidate@email.com"
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={candidate?.phone || ""}
                                onChange={(e) =>
                                  updateCandidateField(index, "phone", e.target.value)
                                }
                                placeholder="e.g., +91..."
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-1">
                                <label className="flex items-center gap-2 border-2 border-dashed border-gray-300 px-2 py-1 cursor-pointer hover:border-gray-500 transition rounded">
                                  <span className="text-gray-500 text-lg shrink-0">
                                    <IoMdCloudUpload />
                                  </span>
                                  <span
                                    title={candidateFileNames[index] || candidate?.cv}
                                    className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis text-xs text-gray-700"
                                  >
                                    {candidateFileNames[index] ||
                                      candidate?.cv ||
                                      "Upload file"}
                                  </span>
                                  <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0] || null;
                                      if (!file) return;
                                      handleCandidateFileUpload(index, file);
                                      e.target.value = "";
                                    }}
                                    className="hidden"
                                  />
                                </label>
                                {(candidateFileNames[index] || candidate?.cv) && (
                                  <button
                                    type="button"
                                    onClick={() => handleCandidateRemoveFile(index)}
                                    className="text-xs text-gray-500 hover:text-red-600 self-start"
                                  >
                                    Remove file
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={!!candidate?.offer_directly}
                                onChange={(e) =>
                                  updateCandidateField(index, "offer_directly", e.target.checked)
                                }
                                className="w-4 h-4"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeCandidate(index)}
                                title="Remove candidate"
                                className="text-red-500 hover:text-red-700"
                              >
                                <X size={16} />
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={addCandidate}
                    className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    + Add Candidate
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkUploadOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-primary/40 text-primary rounded text-sm hover:bg-primary/5 transition"
                  >
                    <IoMdCloudUpload className="text-base" />
                    Bulk Upload Resumes
                  </button>
                </div>

                <BulkResumeUploadModal
                  open={bulkUploadOpen}
                  onClose={() => setBulkUploadOpen(false)}
                  uploadFile={(file) => uploadMutation.mutateAsync(file)}
                  onUploaded={handleBulkResumesUploaded}
                  existingFileNames={[
                    ...Object.values(candidateFileNames),
                    ...(((formData as any).custom_pre_screened_candidates || [])
                      .map((c: any) => c?.cv)
                      .filter(Boolean)
                      .map((url: string) => {
                        // Strip any query/hash, take the last path segment, and
                        // decode %20 etc. so duplicate detection matches the
                        // original file name.
                        const base =
                          url.split("?")[0].split("#")[0].split("/").pop() || "";
                        try {
                          return decodeURIComponent(base);
                        } catch {
                          return base;
                        }
                      })),
                  ]}
                />
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 gap-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                size="md"
              >
                Previous
              </Button>

        {!isLastStep ? (
          <div className="flex items-center gap-3">
            {/* Preview button — only on the Job Details tab (index 1), left of Next */}
         
              <Button
                variant="outline"
                size="md"
                onClick={handlePreviewJobDetails}
                className="px-4 md:px-6 py-2"
              >
                Preview
              </Button>
           
            <Button size="md" onClick={handleNext} className="px-4 md:px-6 py-2">
              Next
            </Button>
          </div>
        ) : (
          <Button
            size="md"
            onClick={handleSubmitWithPreview}
            className="px-4 md:px-6 py-2"
          >
            {isBusy
              ? isEditMode ? "Saving…" : "Submitting…"
              : isEditMode ? "Save Changes" : "Submit"}
          </Button>
        )}
      </div>
          </>
        )}
      </div>


      {/* JD Preview Modal */}
      {jdPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setJdPreviewOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Job Description Preview</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {(formData as any).designation}
                  {(formData as any).department ? ` · ${(formData as any).department}` : ""}
                </p>
              </div>
              <button
                onClick={() => setJdPreviewOpen(false)}
                className="p-2 rounded-md hover:bg-gray-100 text-gray-500 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {jdLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="animate-spin text-indigo-500" size={32} />
                  <span className="ml-3 text-gray-500 text-sm">Loading job description…</span>
                </div>
              ) : (
                <div
                  className="prose prose-sm max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: jdContent }}
                />
              )}
            </div>

            {/* Modal footer */}
            <div className="flex justify-end px-6 py-4 border-t">
              <button
                onClick={() => setJdPreviewOpen(false)}
                className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job Details Preview Modal */}
      {jobDetailsPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setJobDetailsPreviewOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {jobDetailsPreview.title || "Job Description Preview"}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {(formData as any).designation}
                  {(formData as any).department ? ` · ${(formData as any).department}` : ""}
                  {jobDetailsPreview.source ? ` · ${jobDetailsPreview.source}` : ""}
                </p>
              </div>
              <button
                onClick={() => setJobDetailsPreviewOpen(false)}
                className="p-2 rounded-md hover:bg-gray-100 text-gray-500 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {jobDetailsPreview.loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="animate-spin text-indigo-500" size={32} />
                  <span className="ml-3 text-gray-500 text-sm">Loading job description…</span>
                </div>
              ) : (
                <>
                  <div
                    className="prose prose-sm max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: jobDetailsPreview.html }}
                  />

                  {/* The exact payload that was sent to the API */}
                </>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex justify-end px-6 py-4 border-t">
              <button
                onClick={() => setJobDetailsPreviewOpen(false)}
                className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequisitionForm;
