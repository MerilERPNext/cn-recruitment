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

// Configured salary bounds for one timeframe. A null/absent bound is open on
// that side.
export interface SalaryLimit {
  min?: number | null;
  max?: number | null;
}

export interface FormConfig {
  settings?: string;
  hiring_type?: string;
  // "Max number of positions per requisition" from Recruitment Settings. 0 or
  // absent means no limit — the same reading the server's own check uses.
  max_positions_per_requisition?: number;
  // Allowed salary band per timeframe, e.g. { Annual: { min, max }, Monthly: ... }.
  // Timeframes missing from the map are unrestricted.
  salary_limits?: Record<string, SalaryLimit>;
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

// ---------------------------------------------------------------------------
// Salary limits
//
// The band a salary must fall in depends on the selected Salary Timeframe: an
// Annual figure and a Monthly one are checked against different bounds. The
// server sends the whole map, so the rules follow whatever is configured rather
// than being hardcoded, and a timeframe with no entry is simply unrestricted.
// ---------------------------------------------------------------------------
const SALARY_MIN_LABEL = "Salary Range (Min)";
const SALARY_MAX_LABEL = "Salary Range (Max)";

/**
 * A salary amount as a number; blank / non-numeric input reads as "not given".
 * The salary inputs display grouped digits ("5,00,000"), so the separators are
 * stripped before the value is read as a number.
 */
function toSalaryAmount(value: any): number | null {
  if (value === undefined || value === null || value === "") return null;
  const amount = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(amount) ? amount : null;
}

/**
 * What the user types in a salary field, grouped Indian-style for display:
 * "500000" → "5,00,000". Anything that isn't a digit or a decimal point is
 * dropped, and a half-typed decimal ("5000." / "5000.5") is preserved so the
 * caret keeps up with the typing.
 */
export function formatSalaryInput(value: any): string {
  if (value === undefined || value === null) return "";
  const digits = String(value).replace(/[^\d.]/g, "");
  if (digits === "") return "";

  const [whole, ...decimalParts] = digits.split(".");
  const decimals = decimalParts.length
    ? `.${decimalParts.join("").slice(0, 2)}`
    : "";
  const grouped =
    whole === ""
      ? ""
      : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
          Number(whole)
        );

  return `${grouped}${decimals}`;
}

/** The plain amount behind a displayed salary — "5,00,000" → "500000". */
export function parseSalaryInput(value: any): string {
  if (value === undefined || value === null) return "";
  return String(value).replace(/[^\d.]/g, "");
}

/** Group digits the way the rest of the app shows amounts (e.g. 1,00,000). */
export function formatSalaryAmount(value: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

/**
 * The bounds configured for `timeframe`, or null when that timeframe is
 * unrestricted (absent from the map, or open on both sides).
 */
export function getSalaryLimit(
  config: FormConfig | null,
  timeframe: any
): SalaryLimit | null {
  if (!config?.salary_limits || !timeframe) return null;
  const configured = config.salary_limits[String(timeframe)];
  if (!configured) return null;

  const min = toSalaryAmount(configured.min);
  const max = toSalaryAmount(configured.max);
  return min === null && max === null ? null : { min, max };
}

/** "between 1,00,000 and 5,00,000" / "at least 1,00,000" / "at most 5,00,000". */
export function describeSalaryLimit(limit: SalaryLimit): string {
  const min = toSalaryAmount(limit.min);
  const max = toSalaryAmount(limit.max);
  if (min !== null && max !== null) {
    return `between ${formatSalaryAmount(min)} and ${formatSalaryAmount(max)}`;
  }
  if (min !== null) return `at least ${formatSalaryAmount(min)}`;
  return `at most ${formatSalaryAmount(max as number)}`;
}

/**
 * Salary Range (Min)/(Max) against the band configured for the selected
 * timeframe, plus the ordering rule between the two. One message per broken
 * rule; empty when the pair is fine, not yet filled, or unrestricted.
 */
export function validateSalaryRange(
  config: FormConfig | null,
  data: Record<string, any>
): string[] {
  const errors: string[] = [];
  const min = toSalaryAmount(data?.salary_min);
  const max = toSalaryAmount(data?.salary_max);

  if (min !== null && max !== null && min > max) {
    errors.push(`${SALARY_MIN_LABEL} cannot be greater than ${SALARY_MAX_LABEL}.`);
  }

  const timeframe = data?.salary_timeframe;
  const limit = getSalaryLimit(config, timeframe);
  if (!limit) return errors;

  const allowed = describeSalaryLimit(limit);
  ([
    [SALARY_MIN_LABEL, min],
    [SALARY_MAX_LABEL, max],
  ] as [string, number | null][]).forEach(([label, value]) => {
    if (value === null) return;
    const belowFloor = limit.min !== null && limit.min !== undefined && value < limit.min;
    const aboveCeiling = limit.max !== null && limit.max !== undefined && value > limit.max;
    if (belowFloor || aboveCeiling) {
      errors.push(`${timeframe} ${label} must be ${allowed}.`);
    }
  });

  return errors;
}

// ---------------------------------------------------------------------------
// Cost Center Allocation percentages
//
// A position splits its cost across one or more cost centers. Every single
// percentage is bounded to 0–100, and the percentages of one position must add
// up to exactly 100% before the position step can be left / the requisition
// submitted. The rules are derived from the backend config (a nested table
// column carrying a percentage field) rather than hardcoded to
// `cost_center_allocations`, so a renamed or additional allocation table is
// covered by the same checks.
// ---------------------------------------------------------------------------
export const ALLOCATION_PERCENTAGE_MIN = 0;
export const ALLOCATION_PERCENTAGE_MAX = 100;
export const ALLOCATION_PERCENTAGE_TOTAL = 100;

export interface AllocationTable {
  /** The nested table column, e.g. `cost_center_allocations`. */
  fieldname: string;
  label: string;
  /** The nested percentage column, e.g. `percentage`. */
  percentageFieldname: string;
  /** The nested column identifying the allocation, e.g. `cost_center`. */
  keyFieldname?: string;
}

/** A numeric nested column that holds a percentage share. */
export function isPercentageField(field: BackendField): boolean {
  return /percent/i.test(field.fieldname) || /%/.test(field.label || "");
}

/**
 * Every nested allocation table inside the Position Details child table that
 * carries a percentage column, read off the backend form config.
 */
export function findAllocationTables(config: FormConfig | null): AllocationTable[] {
  if (!config) return [];
  const tables: AllocationTable[] = [];
  config.tabs.forEach((tab) =>
    tab.sections.forEach((section) =>
      section.fields.forEach((field) => {
        if (field.fieldname !== "custom_position_details" && field.fieldname !== "positions") {
          return;
        }
        (field.child_fields || []).forEach((childField) => {
          if (!childField.is_nested_table) return;
          const nested = childField.nested_fields || [];
          const percentageField = nested.find(isPercentageField);
          if (!percentageField) return;
          tables.push({
            fieldname: childField.fieldname,
            label: childField.nested_label || childField.label || childField.fieldname,
            percentageFieldname: percentageField.fieldname,
            keyFieldname: nested.find((f) => f !== percentageField)?.fieldname,
          });
        });
      })
    )
  );
  return tables;
}

/** Clamp a typed percentage into 0–100, leaving a blank value untouched. */
export function clampPercentage(value: any): any {
  if (value === undefined || value === null || value === "") return value;
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  if (num < ALLOCATION_PERCENTAGE_MIN) return ALLOCATION_PERCENTAGE_MIN;
  if (num > ALLOCATION_PERCENTAGE_MAX) return ALLOCATION_PERCENTAGE_MAX;
  return value;
}

/** Round away float drift so 33.33 + 33.33 + 33.34 reads as exactly 100. */
function roundTotal(sum: number): number {
  return Math.round(sum * 100) / 100;
}

/**
 * Clamp every allocation percentage across all position rows. Returns the
 * position rows unchanged (same reference) when nothing was out of range, so
 * the caller only has to push a correction back into Form.io when it matters.
 */
export function clampAllocationPercentages(
  positions: any[],
  tables: AllocationTable[]
): { positions: any[]; changed: boolean } {
  if (!Array.isArray(positions) || tables.length === 0) {
    return { positions, changed: false };
  }
  let changed = false;
  const next = positions.map((position) => {
    if (!position || typeof position !== "object") return position;
    let nextPosition = position;
    tables.forEach(({ fieldname, percentageFieldname }) => {
      const allocations = nextPosition[fieldname];
      if (!Array.isArray(allocations)) return;
      let rowsChanged = false;
      const nextAllocations = allocations.map((allocation) => {
        if (!allocation || typeof allocation !== "object") return allocation;
        const clamped = clampPercentage(allocation[percentageFieldname]);
        if (clamped === allocation[percentageFieldname]) return allocation;
        rowsChanged = true;
        return { ...allocation, [percentageFieldname]: clamped };
      });
      if (!rowsChanged) return;
      changed = true;
      nextPosition = { ...nextPosition, [fieldname]: nextAllocations };
    });
    return nextPosition;
  });
  return changed ? { positions: next, changed } : { positions, changed: false };
}

/** "Position 2 (Bangalore)" — enough detail to find the offending row. */
export function positionRowLabel(position: any, index: number): string {
  const detail =
    position?.location_title ||
    position?.location ||
    position?.designation_title ||
    position?.designation;
  return detail ? `Position ${index + 1} (${detail})` : `Position ${index + 1}`;
}

/**
 * Per-position "allocations must total exactly 100%" errors, one message per
 * offending position row. Rows with no allocation content at all are left to
 * the required-field checks.
 */
export function validateAllocationTotals(
  positions: any[],
  tables: AllocationTable[]
): string[] {
  if (!Array.isArray(positions) || tables.length === 0) return [];
  const errors: string[] = [];
  positions.forEach((position, index) => {
    tables.forEach(({ fieldname, label, percentageFieldname, keyFieldname }) => {
      const allocations = Array.isArray(position?.[fieldname]) ? position[fieldname] : [];
      const filled = allocations.filter(
        (allocation: any) =>
          allocation &&
          typeof allocation === "object" &&
          Object.values(allocation).some((v) => !isBlankValue(v))
      );
      if (filled.length === 0) return;

      const total = roundTotal(
        filled.reduce(
          (sum: number, allocation: any) =>
            sum + (Number(allocation[percentageFieldname]) || 0),
          0
        )
      );
      if (total !== ALLOCATION_PERCENTAGE_TOTAL) {
        errors.push(
          `${positionRowLabel(position, index)}: ${label} must total ` +
            `${ALLOCATION_PERCENTAGE_TOTAL}% — currently ${total}%.`
        );
      }

      // The same cost center twice in one position silently doubles its share.
      if (!keyFieldname) return;
      const seen = new Set<string>();
      const reported = new Set<string>();
      filled.forEach((allocation: any) => {
        const key = allocation[keyFieldname];
        if (isBlankValue(key)) return;
        const id = String(key);
        if (seen.has(id) && !reported.has(id)) {
          errors.push(
            `${positionRowLabel(position, index)}: "${id}" is selected more than once in ${label}.`
          );
          reported.add(id);
        }
        seen.add(id);
      });
    });
  });
  return errors;
}
