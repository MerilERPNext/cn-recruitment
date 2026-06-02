/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo,} from "react";
import { Form } from "@tsed/react-formio";
import {
  requisitionSteps,
  requisitionFormSchemas,
  FormSchemaKeys,
  jobDetailsPreviewFields,
} from "./requisitionFormSchemas";
import Button from "../shared/atoms/Button";
import { useCurrentUser, isAdminUser } from "../../hooks/useCurrentUser";
import { useCurrentEmployeeDetails, useFileUpload } from "../../hooks/useEmployee";
import { useDeleteDocument } from "../../hooks/payroll/UseDeleteDocuemt";
import { useCreateJobRequisition } from "../../hooks/useRecruitment";
import {
  JobRequisitionFormData,
  CreateJobRequisitionPayload,
} from "../../types/recruitment";
import toast from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import FrappeAPI from "../../utils/frappeAPI";
import { useQueryClient } from "@tanstack/react-query";
import { Edit, X, FileText, Loader2 } from "lucide-react";
import { IoMdCloudUpload } from "react-icons/io";
import "../../formio.custom.css";

// ---------------------------------------------------------------------------
// Validation config per step index
// ---------------------------------------------------------------------------
const stepValidationRules: Record<number, { key: string; label: string }[]> = {
  0: [
    { key: "hiring_manager", label: "Hiring Manager" },
    { key: "company", label: "Company" },
    { key: "department", label: "Department" },
    { key: "designation", label: "Designation" },
    { key: "functional_area", label: "Functional Area" },
  ],
  1: [
    { key: "salary_currency", label: "Salary Range (Currency)" },
    { key: "salary_min", label: "Salary Range (Min)" },
    { key: "salary_max", label: "Salary Range (Max)" },
    { key: "salary_timeframe", label: "Salary Timeframe" },
    { key: "location", label: "Location" },
  ],
  2: [
    // positions validated dynamically below
  ],
};

function validateStep(
  step: number,
  formData: JobRequisitionFormData
): string[] {
  const errors: string[] = [];

  const rules = stepValidationRules[step] ?? [];
  for (const rule of rules) {
    const val = (formData as any)[rule.key];
    if (val === undefined || val === null || val === "") {
      errors.push(`${rule.label} is required.`);
    }
  }

  // Step 2: validate position rows
  if (step === 2) {
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
      if (!pos.vacancy_type) {
        errors.push(`Position ${i + 1}: Vacancy Type is required.`);
      }
      if (!pos.location) {
        errors.push(`Position ${i + 1}: Location is required.`);
      }
      if (!pos.reporting_manager) {
        errors.push(`Position ${i + 1}: Reporting Manager is required.`);
      }
      if (pos.vacancy_type === "Replacement" && !pos.replacement_for) {
        errors.push(`Position ${i + 1}: Replacement for is required.`);
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

      functional_area: p.functional_area,
      functional_area_title: p.functional_area_title,

      reporting_manager: p.reporting_manager,
      reporting_manager_title: p.reporting_manager_title,

      replacement_for: p.replacement_for,
      replacement_for_title: p.replacement_for_title,
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
      if (!insideGrid || eagerGrid) next.lazyLoad = false;
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
  }));

  return newData;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const RequisitionForm = () => {
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

  // Job Details tab "Preview" popup state. Holds the human-readable rows shown
  // in the popup plus the payload that will be POSTed to the API later (feature
  // not built yet — the preview/toast surfaces exactly what will be sent).
  const [jobDetailsPreviewOpen, setJobDetailsPreviewOpen] = useState(false);
  const [jobDetailsPreview, setJobDetailsPreview] = useState<{
    rows: { label: string; value: string }[];
    payload: Record<string, any>;
  }>({ rows: [], payload: {} });

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
        }
      } catch (err) {
        console.error("Failed to fetch full requisition for edit:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [existingRequisition, isEditMode]);

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
    }
  }, [currentEmployee, isEditMode, formData.hiring_manager]);


  // ---------------------------------------------------------------------------
  // JD Preview handler
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // JD Preview handler (FIXED to match API response structure)
  // ---------------------------------------------------------------------------
  const handlePreviewJD = async () => {
    const designation = (formData as any).designation;
    const department = (formData as any).department;

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
  // Job Details tab "Preview" — collects only the Job Details (JD) tab fields,
  // builds the payload that will be sent to the API later (feature, not now),
  // shows it in a toast, and opens a read-only preview popup.
  // ---------------------------------------------------------------------------
  const buildJobDetailsPayload = (finalData: any): Record<string, any> => {
    // Reuse the same Work Experience mapping as buildPayload so this future API
    // call stays consistent with the full-submit payload.
    let custom_work_experience: string | undefined;
    let custom_work_experience_range: string | undefined;
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

    return {
      custom_experience_range_from: finalData.experience_from?.toString(),
      custom_experience_range_to: finalData.experience_to?.toString(),
      custom_experience_unit: finalData.experience_unit,
      custom_salary_range_currency: finalData.salary_currency,
      custom_salary_range_min: finalData.salary_min,
      custom_salary_range_max: finalData.salary_max,
      custom_salary_timeframe: finalData.salary_timeframe,
      posting_date: finalData.recruitment_start_date
        ? new Date(finalData.recruitment_start_date).toISOString().split("T")[0]
        : undefined,
      expected_compensation: finalData.expected_compensation
        ? Number(finalData.expected_compensation)
        : undefined,
      expected_by: finalData.expected_by
        ? new Date(finalData.expected_by).toISOString().split("T")[0]
        : undefined,
      custom_employment_type_link: finalData.employment_type,
      custom_location: finalData.location,
      custom_work_experience,
      custom_work_experience_range,
      custom_preferred_notice_period: finalData.custom_preferred_notice_period,
      custom_preferred_company: finalData.preferred_company,
      custom_other_preferred_companies: finalData.custom_other_preferred_companies,
      custom_skills: finalData.custom_skills,
    };
  };

  const handlePreviewJobDetails = () => {
    // Render any field value (incl. url-select objects and multi-select arrays)
    // as a readable string for the popup.
    const formatValue = (v: any): string => {
      if (v === undefined || v === null || v === "") return "—";
      if (Array.isArray(v)) {
        return v.length
          ? v
              .map((item) =>
                item && typeof item === "object"
                  ? item.label ?? item.value ?? JSON.stringify(item)
                  : item
              )
              .join(", ")
          : "—";
      }
      if (typeof v === "object") return v.label ?? v.value ?? JSON.stringify(v);
      return String(v);
    };

    const rows = jobDetailsPreviewFields.map((f) => ({
      label: f.label,
      value: formatValue((formData as any)[f.key]),
    }));

    const payload = buildJobDetailsPayload(formData);

    setJobDetailsPreview({ rows, payload });
    setJobDetailsPreviewOpen(true);

    // Surface the payload that will be sent to the API (future feature) in a toast.
    toast.success(`Job Details payload:\n${JSON.stringify(payload, null, 2)}`, {
      duration: 6000,
      style: { maxWidth: "480px", whiteSpace: "pre-wrap", fontSize: "12px" },
    });
  };

  const handleNext = () => {
    const errors = validateStep(currentStep, formData);
    if (errors.length > 0) {
      setValidationErrors(errors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setValidationErrors([]);
    if (currentStep < requisitionSteps.length - 1) {
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
    if (index < currentStep) {
      setValidationErrors([]);
      setCurrentStep(index);
      return;
    }
    if (index > currentStep) {
      const errors = validateStep(currentStep, formData);
      if (errors.length > 0) {
        setValidationErrors(errors);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setValidationErrors([]);
      setCurrentStep(index);
    }
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

  const handleChange = (changed: { data: any; changed?: { component?: { key?: string }; value?: any } }) => {
    const newData = { ...formData, ...changed.data };

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

    return {
      // Requisition name (e.g. "HR-HIREQ-00013") — dynamic; present on edit.
      job_title: finalData.name || existingRequisition?.name,
      // Source is always "Refer" for this form.
      custom_source: "Refer",
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
      posting_date: finalData.recruitment_start_date
        ? new Date(finalData.recruitment_start_date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      requested_by_dept: finalData.department,
      custom_type_of_position: (finalData.positions || [])[0]?.vacancy_type || "New",
      no_of_positions: finalData.number_of_positions || (finalData.positions || []).length || 1,
      custom_division: finalData.custom_division,
      status: finalData.status,
      expected_compensation: finalData.expected_compensation
        ? Number(finalData.expected_compensation)
        : undefined,
      expected_by: finalData.expected_by
        ? new Date(finalData.expected_by).toISOString().split("T")[0]
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
      custom_position_details: (finalData.positions || []).map((pos: any) => ({
        vacancy_type: pos.vacancy_type || "New",
        location: pos.location,
        reporting_manager: pos.reporting_manager,
        functional_area: pos.functional_area,
        replacement_for: pos.vacancy_type === "Replacement" ? pos.replacement_for : undefined,
      })),
      // ── Attachment URL (uploaded via useFileUpload, same as Invoice.tsx) ──
    };
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
        queryClient.invalidateQueries({ queryKey: ["job-requisitions"] });
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
        navigate("/webapp/recruitment/requisition");
      } catch (error) {
        console.error("Error  creating job requisition:", error);
      }
    }
  };

  // Eager-load the position-grid url-selects (so saved ids render as titles)
  // only when the grid is small enough that per-row loads won't freeze the page.
  const positionRowCount = ((formData as any).positions || []).length;
  const eagerGrid = positionRowCount > 0 && positionRowCount <= 25;

  const currentSchema = useMemo(() => {
    const stepKey = requisitionSteps[currentStep].key as FormSchemaKeys;
    const schema = requisitionFormSchemas[stepKey];

    let components = schema.components as any[];

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
  }, [currentStep, canEditEmployeeField, eagerGrid]);

  const isBusy = isUpdating || createJobRequisition.isPending;
  const canPreviewJD = !!(formData as any).designation && !!(formData as any).department;

  // Last step = "Other Details" (index 3)
  const isLastStep = currentStep === requisitionSteps.length - 1;

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
            {" — "}{existingRequisition.designation}, {existingRequisition.department}
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
          {requisitionSteps.map((step, index) => (
            <div
              key={step.key}
              className={`flex-1 min-w-[140px] md:min-w-0 text-center pb-4 px-2 cursor-pointer whitespace-nowrap ${index === currentStep
                ? "text-primary-500 border-b-2 border-primary-500 font-semibold"
                : "text-gray-500"
                }`}
              onClick={() => handleStepClick(index)}
            >
              {step.label}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-semibold">
            {requisitionSteps[currentStep].label}
          </h2>
          {/* Preview JD button — only on Job Details step (index 1) */}
          {currentStep === 1 && (
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

        {/* ── Position counts (plain React inputs, kept out of formio to avoid
             the controlled-input override issue) ── */}
        {currentStep === 2 && (
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

        <Form
          form={currentSchema}
          submission={{ data: formData }}
          onChange={handleChange}
          onSubmit={handleSubmit}
        />

        {/* ── Position Selection summary bar (totals + bulk vacancy-type toggle) ── */}
        {currentStep === 2 && (() => {
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
        {currentStep === 3 && (
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
            <button
              type="button"
              onClick={addCandidate}
              className="mt-2 px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              + Add Candidate
            </button>
          </div>
        )}
      </div>

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
            {currentStep === 1 && (
              <Button
                variant="outline"
                size="md"
                onClick={handlePreviewJobDetails}
                className="px-4 md:px-6 py-2"
              >
                Preview
              </Button>
            )}
            <Button size="md" onClick={handleNext} className="px-4 md:px-6 py-2">
              Next
            </Button>
          </div>
        ) : (
          <Button
            size="md"
            onClick={() => handleSubmit({ data: formData })}
            className="px-4 md:px-6 py-2"
          >
            {isBusy
              ? isEditMode ? "Saving…" : "Submitting…"
              : isEditMode ? "Save Changes" : "Submit"}
          </Button>
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
                <h3 className="text-lg font-semibold text-gray-800">Job Details Preview</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Review the Job Details before continuing
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
              <table className="min-w-full text-sm">
                <tbody>
                  {jobDetailsPreview.rows.map((row) => (
                    <tr key={row.label} className="border-b last:border-b-0">
                      <td className="py-2 pr-4 font-medium text-gray-600 align-top w-1/2">
                        {row.label}
                      </td>
                      <td className="py-2 text-gray-800 break-words">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Payload that will be sent to the API (future feature) */}
              <div className="mt-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  API Payload (preview)
                </p>
                <pre className="text-xs bg-gray-50 border rounded-md p-3 overflow-x-auto text-gray-700">
                  {JSON.stringify(jobDetailsPreview.payload, null, 2)}
                </pre>
              </div>
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