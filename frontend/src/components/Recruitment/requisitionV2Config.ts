/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// Shared pieces of the config-driven Job Requisition form (V2): the shape the
// backend returns, the fieldname → form-data key map, and the depends-on
// helpers. Lives outside RequisitionFormV2 so the review step can read the same
// config with the same rules instead of duplicating them.
//
// Endpoint: recruitment.api.job_requisition.get_job_requisition_form_config
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types mirroring the backend API response
// ---------------------------------------------------------------------------
export interface BackendField {
  fieldname: string;
  label: string;
  fieldtype: string;
  options?: string;
  is_mandatory?: number;
  read_only?: number;
  depends_on?: string;
  mandatory_depends_on?: string;
  default?: any;
  order?: number;
  child_doctype?: string;
  child_fields?: BackendField[];
  is_nested_table?: number;
  nested_label?: string;
  nested_fields?: BackendField[];
}

export interface BackendSection {
  section: string;
  fields: BackendField[];
}

export interface BackendTab {
  tab: string;
  sections: BackendSection[];
}

export interface FormConfig {
  settings?: string;
  hiring_type?: string;
  tabs: BackendTab[];
  child_groups?: Record<string, any>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export const FIELDNAME_TO_FORM_KEY: Record<string, string> = {
  requested_by: "hiring_manager",
  custom_hiring_lead: "hiring_lead",
  custom_experience_range_from: "experience_from",
  custom_experience_range_to: "experience_to",
  custom_experience_unit: "experience_unit",
  custom_salary_range_currency: "salary_currency",
  custom_salary_range_min: "salary_min",
  custom_salary_range_max: "salary_max",
  custom_salary_timeframe: "salary_timeframe",
  custom_employment_type_link: "employment_type",
  custom_location: "location",
  custom_functional_area: "functional_area",
  posting_date: "recruitment_start_date",
  no_of_positions: "number_of_positions",
  custom_position_details: "positions",
};

export function formKey(fieldname: string): string {
  return FIELDNAME_TO_FORM_KEY[fieldname] || fieldname;
}

/**
 * Rewrite a Frappe `depends_on` / `mandatory_depends_on` expression so it reads
 * from the form data. Inside the Vacancy Details grid the controlling value is
 * the row's own column — Position Details conditions are written against the
 * old parent requisition field (`custom_type_of_position`), which the grid
 * models as the row's Vacancy Type.
 */
export function translateDependsOn(expr: string, inGrid = false): string {
  return expr
    .replace(/^eval:\s*/i, "")
    .replace(/(?:doc|data)\.([\w]+)/g, (_, key: string) => {
      if (!inGrid) return `data.${formKey(key)}`;
      if (key === "custom_type_of_position") return "row.vacancy_type";
      return `row.${formKey(key)}`;
    });
}

/** Evaluate a depends-on condition; a malformed expression never blocks the form. */
export function evalDependsOn(
  expr: string | undefined,
  inGrid: boolean,
  data: Record<string, any>,
  row?: Record<string, any>
): boolean {
  if (!expr) return false;
  try {
    return !!new Function(
      "data",
      "row",
      `return !!(${translateDependsOn(expr, inGrid)});`
    )(data, row || {});
  } catch {
    return false;
  }
}

/**
 * True when a field is mandatory exactly while it is visible — i.e. its
 * `mandatory_depends_on` and `depends_on` are the same condition, ignoring
 * spacing and `==` / `===` / quote style.
 */
export function mandatoryMatchesVisibility(field: BackendField): boolean {
  if (!field.mandatory_depends_on || !field.depends_on) return false;
  const normalise = (expr: string) =>
    translateDependsOn(expr)
      .replace(/\s+/g, "")
      .replace(/===/g, "==")
      .replace(/!==/g, "!=")
      .replace(/"/g, "'");
  return normalise(field.mandatory_depends_on) === normalise(field.depends_on);
}

/** Empty for required-field purposes — mirrors the Form.io required check. */
export function isBlankValue(value: any): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}
