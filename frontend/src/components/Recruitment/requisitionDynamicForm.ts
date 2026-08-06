/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// Backend-driven form configuration for the Job Requisition form.
//
// The static form.io schemas in requisitionFormSchemas.ts stay the source of
// truth for LAYOUT and FEATURES (cascading url-selects, custom validations,
// datagrids, the plain-React count / candidate tables, etc.). This module only
// lets the backend CONTROL those fields:
//   • visibility  — when `restrict_to_configured` is true, a mapped field that
//                   the backend does NOT return is removed from the form.
//   • mandatory   — `is_mandatory` toggles the field's required validation.
//   • read_only   — `read_only` disables the field.
//   • label       — the backend label overrides the static one.
//   • order       — a step's top-level components are re-sequenced to match the
//                   builder's arrangement. Only the top level moves, so a
//                   `columns` row keeps its side-by-side pair and a datagrid
//                   keeps its columns; the static layout survives intact.
// It never touches submit / payload logic.
//
// Backend fields that have NO static counterpart (brand-new custom fields) are
// auto-generated as generic form.io components from their `fieldtype` and
// appended to the matching step.
//
// Endpoint:
//   recruitment.api.job_requisition.get_job_requisition_form_config
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
  length?: number;
  order?: number;
  default?: any;
  // Nested child table (e.g. Cost Center Allocations inside a Position row).
  is_nested_table?: number;
  nested_label?: string;
  nested_fields?: BackendField[];
  // Table field declared inside a tab (e.g. the Position Details table). Newer
  // backends return such tables here instead of under `child_groups`; their
  // columns live in `child_fields`.
  child_doctype?: string;
  child_fields?: BackendField[];
}

export interface BackendSection {
  section: string;
  fields: BackendField[];
}

export interface BackendTab {
  tab: string;
  sections: BackendSection[];
}

export interface JobRequisitionFormConfig {
  settings?: string;
  restrict_to_configured?: boolean;
  tabs: BackendTab[];
  child_groups?: Record<string, any>;
}

// ---------------------------------------------------------------------------
// Form component key (in requisitionFormSchemas) → backend fieldname.
// Only confident 1:1 matches are listed. A key that is NOT here is treated as
// "not backend-controlled" and is always kept (so we never hide a working field
// just because we couldn't map it).
// ---------------------------------------------------------------------------
export const KEY_TO_FIELDNAME: Record<string, string> = {
  // Basic Details
  hiring_manager: "requested_by",
  company: "company",
  department: "department",
  designation: "designation",
  functional_area: "custom_functional_area",

  // Job Details
  experience_from: "custom_experience_range_from",
  experience_to: "custom_experience_range_to",
  experience_unit: "custom_experience_unit",
  salary_currency: "custom_salary_range_currency",
  salary_min: "custom_salary_range_min",
  salary_max: "custom_salary_range_max",
  salary_timeframe: "custom_salary_timeframe",
  recruitment_start_date: "posting_date",
  hiring_lead: "custom_hiring_lead",
  expected_by: "expected_by",
  employment_type: "custom_employment_type_link",
  location: "custom_location",
  custom_preferred_notice_period: "custom_preferred_notice_period",
  preferred_company: "custom_preferred_company",
  custom_other_preferred_companies: "custom_other_preferred_companies",
  additional_roles_responsibilities: "custom_additional_roles__responsibilities",
  custom_skills: "custom_additional_skills",

  // Other Details
  comments_instructions: "custom_comments__instructions",
};

// Reverse: backend fieldname → form data key. Used by the Review page to read
// each backend field's value out of `formData` (which is keyed by form key, not
// fieldname). An auto-generated field's key IS its fieldname, so unmapped
// fieldnames fall back to themselves.
export const FIELDNAME_TO_KEY: Record<string, string> = Object.entries(
  KEY_TO_FIELDNAME
).reduce((acc, [key, fieldname]) => {
  acc[fieldname] = key;
  return acc;
}, {} as Record<string, string>);

export function formKeyForFieldname(fieldname: string): string {
  return FIELDNAME_TO_KEY[fieldname] || fieldname;
}

// Backend tab label → static step key in requisitionFormSchemas.
export const TAB_TO_STEP_KEY: Record<string, string> = {
  "Basic Details": "basicDetails",
  "Job Details": "jobDetails",
  "Position Selection": "positionSelection",
  "Other Details": "otherDetails",
};

// child_group fieldnames that the static form already renders as datagrids /
// custom tables. They must be considered "known" so we never auto-generate a
// duplicate input for them.
const KNOWN_CHILD_GROUP_FIELDS = new Set<string>([
  "no_of_positions",
  "custom_position_details",
  "custom_regions",
  "custom_qualifications",
  "custom_skills",
  "custom_pre_screened_candidates",
]);

// Static datagrid `key` → backend child_group key. The datagrid's INNER columns
// are controlled by that child group's `fields` (their keys match the backend
// fieldnames directly — e.g. the Position table's `location`, `functional_area`,
// `cost_center_allocations`). This is how the Position tab columns get hidden /
// shown from the API.
const DATAGRID_KEY_TO_CHILD_GROUP: Record<string, string> = {
  positions: "custom_position_details",
  custom_regions: "custom_regions",
  custom_qualifications: "custom_qualifications",
};

// Columns inside a datagrid that are structural/feature controls (not data
// fields the backend configures), so they are always kept regardless of config.
const STRUCTURAL_GRID_KEYS = new Set<string>([
  "position_number",
  "vacancy_type",
]);

// Fields that are ALWAYS auto-derived from the selected Designation
// (Designation.custom_functional_area) — both the Basic Details field
// (`custom_functional_area`) and the Position-row column (`functional_area`).
// The dynamic layer forces them READ-ONLY and NOT mandatory so a backend
// config can never make them editable or required.
const AUTO_DERIVED_READONLY_FIELDS = new Set<string>([
  "custom_functional_area",
  "functional_area",
]);

// Backend fieldname → the dependency filter its option URL must carry and the
// field it refreshes on. Keeps a generated Link field in sync with its parent:
//   • Employment Type / Work Location filter by the selected company,
//   • Functional Area filters by the selected designation.
const LINK_FIELD_DEPENDENCIES: Record<
  string,
  { filter: string; on: string; doctype?: string; customConditional?: string }
> = {
  custom_employment_type_link: {
    filter: "&company={{ data.company }}",
    on: "company",
  },
  custom_location: {
    filter: "&custom_company={{ data.company }}",
    on: "company",
  },
  // Position child-table "Employee Type" column (Position Details.employee_type
  // → Employment Type) — scope to the requisition's company.
  employee_type: {
    filter: "&company={{ data.company }}",
    on: "company",
  },
  // Position Details.sub_location is a child-row Link. Its options must be
  // scoped to the Location selected in that same Position Details row. The
  // `Sub Location` doctype stores that parent link in its `branch` field.
  sub_location: {
    filter: "&branch={{ row.location }}",
    on: "location",
    doctype: "Sub Location",
    // Do not show or request sub-locations until this Position Details row has
    // a location. `clearOnHide` below also clears it when Location is removed.
    customConditional: "show = !!row.location",
  },
  custom_functional_area: {
    filter: "&designation={{ data.designation }}",
    on: "designation",
  },
};

// Force a component to read-only + non-mandatory when its fieldname is one of
// the auto-derived fields. Also strips the `required-field` marker class.
function enforceAutoDerived(component: any, fieldname: string): any {
  if (!AUTO_DERIVED_READONLY_FIELDS.has(fieldname)) return component;
  const next: any = { ...component, disabled: true };
  next.validate = { ...(next.validate || {}), required: false };
  if (typeof next.customClass === "string") {
    const cls = next.customClass.replace(/\brequired-field\b/g, "").trim();
    next.customClass = cls || undefined;
  }
  return next;
}

// ---------------------------------------------------------------------------
// Flatten the config into a fast lookup: fieldname → BackendField, plus the set
// of every fieldname that appears anywhere in the config (tabs + child_groups).
// ---------------------------------------------------------------------------
export interface FlattenedConfig {
  byFieldname: Map<string, BackendField>;
  // fieldname → backend tab label (for placing auto-generated extra fields)
  tabOfField: Map<string, string>;
  presentFieldnames: Set<string>;
  // Raw tabs/sections (drives the dynamic Review page rendering).
  tabs: BackendTab[];
  // Raw child_groups block (drives the datagrid columns, e.g. Position table).
  childGroups: Record<string, any>;
  restrict: boolean;
}

export function flattenConfig(config: JobRequisitionFormConfig): FlattenedConfig {
  const byFieldname = new Map<string, BackendField>();
  const tabOfField = new Map<string, string>();
  const presentFieldnames = new Set<string>();

  (config.tabs || []).forEach((tab) => {
    (tab.sections || []).forEach((section) => {
      (section.fields || []).forEach((field) => {
        byFieldname.set(field.fieldname, field);
        tabOfField.set(field.fieldname, tab.tab);
        presentFieldnames.add(field.fieldname);
      });
    });
  });

  // Table fields declared inside tabs (e.g. custom_position_details) expose their
  // columns via `child_fields`. Newer backends return the Position table this way
  // instead of under `child_groups`, so normalize it into the same childGroups
  // shape ({ group, child_doctype, fields }) the grid-column logic consumes.
  const childGroups: Record<string, any> = { ...(config.child_groups || {}) };
  (config.tabs || []).forEach((tab) =>
    (tab.sections || []).forEach((section) =>
      (section.fields || []).forEach((field) => {
        if (
          field.fieldtype === "Table" &&
          Array.isArray(field.child_fields) &&
          !childGroups[field.fieldname]
        ) {
          childGroups[field.fieldname] = {
            group: field.label,
            child_doctype: field.child_doctype,
            fields: field.child_fields,
          };
        }
      })
    )
  );

  // child_group fieldnames are also "present" (so mapped keys like custom_skills
  // that live in a child group are not hidden).
  Object.keys(childGroups).forEach((k) => presentFieldnames.add(k));

  return {
    byFieldname,
    tabOfField,
    presentFieldnames,
    tabs: config.tabs || [],
    childGroups,
    restrict: Boolean(config.restrict_to_configured),
  };
}

// ---------------------------------------------------------------------------
// Resolve a backend field's display value out of `formData` for the Review
// page. Prefers the captured human-readable `${key}_title` over the raw id, and
// flags Employee Link fields so the caller can attach a hover card.
// ---------------------------------------------------------------------------
export interface ReviewFieldValue {
  fieldname: string;
  label: string;
  value: any;
  fieldtype: string;
  isEmployee: boolean;
  employeeId?: string;
}

export function resolveReviewField(
  field: BackendField,
  formData: any
): ReviewFieldValue {
  const key = formKeyForFieldname(field.fieldname);
  const title = formData?.[`${key}_title`];
  const raw = formData?.[key];
  const isEmployee = field.fieldtype === "Link" && field.options === "Employee";

  let value: any;
  if (field.fieldtype === "Check") {
    value = raw; // boolean → caller renders Yes/No
  } else {
    const hasTitle = title !== undefined && title !== null && title !== "";
    value = hasTitle ? title : raw;
  }

  return {
    fieldname: field.fieldname,
    label: field.label,
    value,
    fieldtype: field.fieldtype,
    isEmployee,
    employeeId: isEmployee && raw ? String(raw) : undefined,
  };
}

// Tab fieldnames that the Review page renders with a DEDICATED block instead of
// the generic scalar row (so they're skipped in the scalar loop):
//   • custom_additional_skills → mapped to the Skills tags block
//   • no_of_positions          → shown as the Total/New/Replacement counts block
export const REVIEW_SKIP_SCALAR = new Set<string>([
  "custom_additional_skills",
  "no_of_positions",
]);

// ---------------------------------------------------------------------------
// Build a fieldname → BackendField lookup for a child group's fields. Returns
// null when the child group is absent from the config, so callers can fall back
// to leaving the datagrid untouched.
// ---------------------------------------------------------------------------
function childGroupFieldMap(
  flat: FlattenedConfig,
  childGroupKey: string
): Map<string, BackendField> | null {
  const cg = flat.childGroups?.[childGroupKey];
  if (!cg || !Array.isArray(cg.fields)) return null;
  const map = new Map<string, BackendField>();
  cg.fields.forEach((f: BackendField) => map.set(f.fieldname, f));
  return map;
}

// ---------------------------------------------------------------------------
// Filter a datagrid's inner columns against its child-group field set:
//   • structural columns (position number, vacancy type) → always kept,
//   • a column present in the child group → kept (label / required overridden;
//     a nested table recurses against its `nested_fields`),
//   • a column absent from the child group → hidden when `restrict`.
// ---------------------------------------------------------------------------
function filterGridColumns(
  components: any[],
  fieldMap: Map<string, BackendField>,
  flat: FlattenedConfig
): any[] {
  if (!Array.isArray(components)) return components;

  const out: any[] = [];
  // Static columns we've already emitted, so config-only columns (no static
  // counterpart) can be appended afterwards.
  const renderedKeys = new Set<string>();
  for (const comp of components) {
    const c: any = { ...comp };
    const key: string | undefined = c.key;

    if (!key || STRUCTURAL_GRID_KEYS.has(key)) {
      out.push(c);
      continue;
    }

    renderedKeys.add(key);

    const field = fieldMap.get(key);
    if (field) {
      // Nested child table (e.g. Cost Center Allocations) → filter its own
      // columns against the backend `nested_fields`.
      if (
        (c.type === "datagrid" || c.type === "editgrid") &&
        Array.isArray(field.nested_fields)
      ) {
        const nestedMap = new Map<string, BackendField>();
        field.nested_fields.forEach((f) => nestedMap.set(f.fieldname, f));
        c.components = filterGridColumns(c.components, nestedMap, flat);
      }
      // manageCustomClass=false → don't add the `required-field` marker class to
      // grid cells (the asterisk is rendered in the column header natively).
      out.push(overrideComponent(c, field, false));
      continue;
    }

    // Column not configured in the child group.
    if (flat.restrict) continue; // hide
    out.push(c);
  }

  // Append generated columns for configured child fields that have no static
  // counterpart (e.g. a brand-new Position column the backend added). Skip
  // structural keys and any nested-table fields (those need a static layout).
  fieldMap.forEach((field, fieldname) => {
    if (renderedKeys.has(fieldname)) return;
    if (STRUCTURAL_GRID_KEYS.has(fieldname)) return;
    if (Array.isArray(field.nested_fields)) return;
    const gen = enforceAutoDerived(generateComponent(field), fieldname);
    // Inside a grid the required asterisk is drawn in the column header, so drop
    // the top-level `required-field` marker class (it would leak a `*` per row).
    delete gen.customClass;
    out.push(gen);
  });

  return out;
}

// ---------------------------------------------------------------------------
// Whether a hardcoded gate-validation rule (the step-level "X is required"
// checks in RequisitionForm) should still apply for a given form key, given the
// backend config. Keeps the JS gate in sync with what the backend renders:
//   • config not loaded / unmapped key → keep the static behavior (true).
//   • mapped field absent from config   → hidden ⇒ don't require it.
//   • mapped field present              → follow its is_mandatory flag.
// ---------------------------------------------------------------------------
export function gateRuleApplies(
  key: string,
  flat: FlattenedConfig | null
): boolean {
  if (!flat) return true;
  const fieldname = KEY_TO_FIELDNAME[key];
  if (!fieldname) return true; // not backend-controlled → static behavior
  // Auto-derived fields (Functional Area) are never gated.
  if (AUTO_DERIVED_READONLY_FIELDS.has(fieldname)) return false;
  const field = flat.byFieldname.get(fieldname);
  if (!field) return flat.restrict ? false : true; // absent ⇒ hidden when restrict
  return Boolean(field.is_mandatory);
}

// ---------------------------------------------------------------------------
// Whether a hardcoded gate-validation rule for a CHILD-GROUP column (e.g. the
// Position table's Cost Center Allocations) should still apply, given the
// backend config:
//   • config not loaded                       → keep static behavior (true).
//   • child group absent from config          → keep static behavior (true).
//   • column absent from the child group      → hidden ⇒ don't enforce.
//   • column present                          → enforce.
// ---------------------------------------------------------------------------
export function childGateApplies(
  childGroupKey: string,
  fieldname: string,
  flat: FlattenedConfig | null
): boolean {
  if (!flat) return true;
  const cg = flat.childGroups?.[childGroupKey];
  if (!cg || !Array.isArray(cg.fields)) return true; // untouched grid
  const present = cg.fields.some((f: BackendField) => f.fieldname === fieldname);
  if (present) return true;
  return flat.restrict ? false : true;
}

// ---------------------------------------------------------------------------
// Whether a CHILD-GROUP column (e.g. a Position table column) should be
// validated as required, following the backend config:
//   • config not loaded / child group untouched → static default.
//   • column absent from the child group         → hidden ⇒ not required.
//   • column present                             → follow its is_mandatory flag.
// ---------------------------------------------------------------------------
export function childFieldMandatory(
  childGroupKey: string,
  fieldname: string,
  flat: FlattenedConfig | null,
  staticDefault: boolean
): boolean {
  if (!flat) return staticDefault;
  // Auto-derived columns (Functional Area) are never required.
  if (AUTO_DERIVED_READONLY_FIELDS.has(fieldname)) return false;
  const cg = flat.childGroups?.[childGroupKey];
  if (!cg || !Array.isArray(cg.fields)) return staticDefault;
  const field = cg.fields.find((f: BackendField) => f.fieldname === fieldname);
  if (!field) return false; // not configured ⇒ hidden ⇒ not required
  return Boolean(field.is_mandatory);
}

// ---------------------------------------------------------------------------
// Whether a NESTED-TABLE column (e.g. the Cost Center / Percentage columns
// inside a Position row's Cost Center Allocations table) should be validated as
// required, following the backend `nested_fields` config — the same logic as
// childFieldMandatory, one level deeper:
//   • config not loaded / child group untouched → static default.
//   • nested table or column absent from the config → not required.
//   • column present                              → follow its is_mandatory flag.
// ---------------------------------------------------------------------------
export function nestedFieldMandatory(
  childGroupKey: string,
  nestedTableFieldname: string,
  fieldname: string,
  flat: FlattenedConfig | null,
  staticDefault: boolean
): boolean {
  if (!flat) return staticDefault;
  const cg = flat.childGroups?.[childGroupKey];
  if (!cg || !Array.isArray(cg.fields)) return staticDefault;
  const nestedTable = cg.fields.find(
    (f: BackendField) => f.fieldname === nestedTableFieldname
  );
  if (!nestedTable || !Array.isArray(nestedTable.nested_fields)) {
    return staticDefault;
  }
  const field = nestedTable.nested_fields.find(
    (f: BackendField) => f.fieldname === fieldname
  );
  if (!field) return false; // not configured ⇒ hidden ⇒ not required
  return Boolean(field.is_mandatory);
}

// ---------------------------------------------------------------------------
// Apply backend overrides (label / required / read-only) to a single static
// component that maps to a backend field. Returns a NEW component object.
// ---------------------------------------------------------------------------
function overrideComponent(
  component: any,
  field: BackendField,
  // Datagrid columns render the required asterisk natively in their column
  // HEADER from `validate.required`. The `required-field` CSS marker class is a
  // top-level-field convention that draws a `*` next to a field LABEL — inside a
  // grid cell (where the label is hidden) it leaks a stray `*` into every row.
  // So we only manage that class for top-level fields, not grid columns.
  manageCustomClass = true
): any {
  const next: any = { ...component };

  if (field.label) next.label = field.label;

  if (field.read_only) next.disabled = true;

  if (field.fieldtype === "Select" && field.options && next.type === "select") {
    const opts = field.options.split("\n").filter(Boolean).map(opt => ({
      label: opt.trim(),
      value: opt.trim()
    }));
    if (opts.length > 0) {
      next.data = { ...next.data, values: opts };
    }
  }

  // Toggle the required flag without dropping any sibling validation (custom,
  // min/max, etc.) the static schema defined.
  const required = Boolean(field.is_mandatory);
  next.validate = { ...(component.validate || {}), required };

  if (manageCustomClass) {
    // Keep the static schema's asterisk marker class in sync with the backend's
    // mandatory flag.
    if (typeof next.customClass === "string") {
      const cls = next.customClass.replace(/\brequired-field\b/g, "").trim();
      next.customClass = required ? `${cls} required-field`.trim() : cls;
    } else if (required) {
      next.customClass = "required-field";
    }
  }

  // Auto-derived fields (Functional Area) are always read-only + non-mandatory,
  // regardless of the backend `is_mandatory` / `read_only` flags.
  return enforceAutoDerived(next, field.fieldname);
}

// ---------------------------------------------------------------------------
// Recursively walk a step's components and:
//   • override mapped fields with their backend config,
//   • drop mapped fields that are absent from the config (when restrict),
//   • leave unmapped / layout / datagrid components untouched.
// Empty layout containers (columns/panels) left with no children after a hide
// are pruned so no blank column slots remain.
// ---------------------------------------------------------------------------
function transformComponents(components: any[], flat: FlattenedConfig): any[] {
  if (!Array.isArray(components)) return components;

  const out: any[] = [];

  for (const comp of components) {
    const c: any = { ...comp };

    // Datagrid / editgrid components are child-TABLE rows. Their columns are
    // governed by the backend `child_groups` (NOT the top-level tab fields), and
    // their inner keys match the child-group fieldnames directly. Filter the
    // columns against that child group so only configured columns (e.g. the
    // Position table's Cost Center Allocations) render. When the child group is
    // absent from the config, leave the grid untouched.
    if (c.type === "datagrid" || c.type === "editgrid") {
      const childGroupKey = c.key ? DATAGRID_KEY_TO_CHILD_GROUP[c.key] : undefined;
      const fieldMap = childGroupKey
        ? childGroupFieldMap(flat, childGroupKey)
        : null;
      if (fieldMap) {
        c.components = filterGridColumns(c.components, fieldMap, flat);
      } else if (childGroupKey && flat.restrict) {
        // The Hiring Type API returns only its applicable child table. Hide the
        // other static grid (Lateral → Position Details; Fresher → Regions).
        continue;
      }
      out.push(c);
      continue;
    }

    // Recurse into plain layout containers (panels / nested groups).
    if (Array.isArray(c.components)) {
      c.components = transformComponents(c.components, flat);
    }
    if (Array.isArray(c.columns)) {
      c.columns = c.columns.map((col: any) => ({
        ...col,
        components: transformComponents(col.components || [], flat),
      }));
    }

    // Input field with a key → check backend mapping.
    const key: string | undefined = c.key;
    const fieldname = key ? KEY_TO_FIELDNAME[key] : undefined;

    if (fieldname) {
      const field = flat.byFieldname.get(fieldname);
      if (field) {
        out.push(overrideComponent(c, field));
        continue;
      }
      // Mapped but not returned by backend.
      if (flat.restrict) {
        // Hidden child-group fields (e.g. custom_skills) are never dropped here
        // because they're added to presentFieldnames; this branch is only for
        // true tab fields the backend chose to omit.
        continue; // skip → field removed
      }
    }

    out.push(c);
  }

  // Prune now-empty column slots and empty columns wrappers so a hidden field
  // doesn't leave a blank half-width gap.
  return out
    .map((c) => {
      if (Array.isArray(c.columns)) {
        const columns = c.columns.filter(
          (col: any) => (col.components || []).length > 0
        );
        return { ...c, columns };
      }
      return c;
    })
    .filter((c) => {
      if (Array.isArray(c.columns)) return c.columns.length > 0;
      return true;
    });
}

// ---------------------------------------------------------------------------
// Generic form.io component generator for a brand-new backend field that has no
// static counterpart. Mirrors the conventions used in requisitionFormSchemas.
// ---------------------------------------------------------------------------
function generateComponent(field: BackendField): any {
  const required = Boolean(field.is_mandatory);
  const base: any = {
    key: field.fieldname,
    label: field.label || field.fieldname,
    input: true,
    customClass: required ? "required-field" : undefined,
    disabled: field.read_only ? true : undefined,
    validate: { required },
    ...(field.default !== undefined && field.default !== ""
      ? { defaultValue: field.default }
      : {}),
  };

  // Company / Designation dependent Link fields must carry their dependency
  // filter (and refresh when the parent changes) even when auto-generated —
  // Employment Type & Work Location filter by company, Functional Area by
  // designation. Mirrors the static schema so the behaviour is identical.
  const dependency = LINK_FIELD_DEPENDENCIES[field.fieldname];
  const linkDoctype = dependency?.doctype || field.options || "";
  const activeEmployeeFilter = linkDoctype === "Employee" ? "&status=Active" : "";

  switch (field.fieldtype) {
    case "Link":
      return {
        ...base,
        type: "select",
        placeholder: `Select ${field.label}`,
        dataSrc: "url",
        data: {
          url: `/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=${linkDoctype}${dependency?.filter || ""}${activeEmployeeFilter}`,
          headers: [{ key: "Accept", value: "application/json" }],
        },
        selectValues: "message.results",
        valueProperty: "id",
        template: field.fieldname === "designation"
          ? "<span>{{ item.label }} <span style='color:#7f8c8d'>({{ item.id }})</span></span>"
          : "<span>{{ item.label }}</span>",
        limit: 20,
        ...(dependency
          ? {
              refreshOn: dependency.on,
              clearOnRefresh: true,
              clearOnHide: true,
              ...(dependency.customConditional
                ? { customConditional: dependency.customConditional }
                : {}),
            }
          : {}),
      };

    case "Select":
      return {
        ...base,
        type: "select",
        placeholder: `Select ${field.label}`,
        data: {
          values: String(field.options || "")
            .split("\n")
            .map((v) => v.trim())
            .filter(Boolean)
            .map((v) => ({ label: v, value: v })),
        },
      };

    case "Date":
      return {
        ...base,
        type: "datetime",
        format: "yyyy-MM-dd",
        enableDate: true,
        enableTime: false,
      };

    case "Datetime":
      return {
        ...base,
        type: "datetime",
        format: "yyyy-MM-dd HH:mm",
        enableDate: true,
        enableTime: true,
      };

    case "Int":
    case "Float":
    case "Currency":
      return { ...base, type: "number" };

    case "Check":
      return { ...base, type: "checkbox" };

    case "Small Text":
    case "Long Text":
    case "Text":
    case "Text Editor":
      return { ...base, type: "textarea", rows: 3 };

    case "Attach":
    case "Attach Image":
      // Rendered as a plain url textfield — file widgets need storage config the
      // generic path can't infer. Users paste / see the stored url.
      return { ...base, type: "textfield", placeholder: "File URL" };

    case "Data":
    default:
      return { ...base, type: "textfield", placeholder: field.label };
  }
}

// ---------------------------------------------------------------------------
// Collect the brand-new backend fields (no static counterpart, not a known
// child group) that belong to a given step, in backend `order`, as generated
// components ready to append to that step.
// ---------------------------------------------------------------------------
function extraComponentsForStep(
  stepKey: string,
  flat: FlattenedConfig
): any[] {
  // fieldnames already represented by a static component in ANY step.
  const mappedFieldnames = new Set(Object.values(KEY_TO_FIELDNAME));

  const extras: BackendField[] = [];
  flat.byFieldname.forEach((field, fieldname) => {
    if (mappedFieldnames.has(fieldname)) return; // has a static component
    if (KNOWN_CHILD_GROUP_FIELDS.has(fieldname)) return; // rendered elsewhere
    const tab = flat.tabOfField.get(fieldname);
    if (!tab || TAB_TO_STEP_KEY[tab] !== stepKey) return;
    extras.push(field);
  });

  extras.sort((a, b) => (a.order || 0) - (b.order || 0));
  return extras.map((f) => enforceAutoDerived(generateComponent(f), f.fieldname));
}

// ---------------------------------------------------------------------------
// Public entry point. Given a step key, its static components, and the fetched
// config, return the components to actually render. When `flat` is null (config
// not loaded / failed) the static components are returned unchanged, so the form
// always works even if the config endpoint is unavailable.
// ---------------------------------------------------------------------------
// Lowest backend `order` of any configured field inside a top-level component,
// or null when it holds none. Datagrids are treated as a single unit: their
// inner keys are CHILD fieldnames and must not be mistaken for parent fields.
function backendOrderOf(comp: any, flat: FlattenedConfig): number | null {
  let best: number | null = null;

  const fieldOf = (c: any): BackendField | undefined => {
    if (!c || !c.key) return undefined;
    // Static components map via KEY_TO_FIELDNAME; auto-generated ones are keyed
    // by the fieldname itself (see generateComponent).
    const mapped = KEY_TO_FIELDNAME[c.key];
    return flat.byFieldname.get(mapped || c.key);
  };

  const visit = (c: any) => {
    if (!c || typeof c !== "object") return;
    const field = fieldOf(c);
    const order = field?.order;
    if (typeof order === "number" && order > 0) {
      best = best === null ? order : Math.min(best, order);
    }
    if (c.type === "datagrid" || c.type === "editgrid") return;
    if (Array.isArray(c.components)) c.components.forEach(visit);
    if (Array.isArray(c.columns)) {
      c.columns.forEach((col: any) => (col.components || []).forEach(visit));
    }
  };

  visit(comp);
  return best;
}

// ---------------------------------------------------------------------------
// Re-sequence a step's top-level components to match the order HR arranged in
// the Job Requisition Form Settings builder.
//
// Only the TOP level is sorted: a `columns` row keeps its side-by-side pair
// intact and a datagrid keeps its columns, so the static layout survives — this
// moves blocks, it does not flatten them. A component carrying no configured
// field (a heading / divider) introduces the block that follows it, so it
// inherits that block's position and stays attached to it.
// ---------------------------------------------------------------------------
function reorderByBackendOrder(
  components: any[],
  flat: FlattenedConfig
): any[] {
  if (!Array.isArray(components) || components.length < 2) return components;

  const own = components.map((c) => backendOrderOf(c, flat));
  if (own.every((o) => o === null)) return components; // nothing to go on

  const anchored: number[] = new Array(components.length);
  let next = Number.POSITIVE_INFINITY;
  for (let i = components.length - 1; i >= 0; i--) {
    if (own[i] !== null) next = own[i] as number;
    anchored[i] = next;
  }

  return components
    .map((c, i) => ({ c, i, k: anchored[i] }))
    .sort((a, b) => (a.k !== b.k ? (a.k < b.k ? -1 : 1) : a.i - b.i))
    .map((x) => x.c);
}

export function applyDynamicConfig(
  stepKey: string,
  staticComponents: any[],
  flat: FlattenedConfig | null
): any[] {
  if (!flat) return staticComponents;
  const transformed = transformComponents(staticComponents, flat);
  const extras = extraComponentsForStep(stepKey, flat);
  const merged = extras.length ? [...transformed, ...extras] : transformed;
  return reorderByBackendOrder(merged, flat);
}

// ---------------------------------------------------------------------------
// Dynamic wizard tabs (steps) driven by the backend `tabs` array.
//
// The 4 "known" tabs reuse the rich static schemas (cascading selects,
// datagrids, the plain-React count / candidate tables, etc.). Any OTHER tab the
// backend returns (e.g. "teast") is brand new — its fields are generated
// generically and the tab is inserted into the wizard in the backend's order.
// ---------------------------------------------------------------------------
export const KNOWN_STEP_KEYS = new Set<string>([
  "basicDetails",
  "jobDetails",
  "positionSelection",
  "otherDetails",
]);

const DYNAMIC_STEP_PREFIX = "dyn:";

// A backend tab label → a stable step key. Known tabs keep their canonical key
// (so their static schema + per-step UI still resolve); unknown tabs get a
// prefixed key carrying the tab name.
export function dynamicStepKeyForTab(tabName: string): string {
  return TAB_TO_STEP_KEY[tabName] || `${DYNAMIC_STEP_PREFIX}${tabName}`;
}

export function isDynamicStepKey(stepKey: string): boolean {
  return stepKey.startsWith(DYNAMIC_STEP_PREFIX);
}

function tabNameFromStepKey(stepKey: string): string {
  return isDynamicStepKey(stepKey)
    ? stepKey.slice(DYNAMIC_STEP_PREFIX.length)
    : stepKey;
}

export interface DynamicStep {
  label: string;
  key: string;
}

// Build the wizard step list (WITHOUT the trailing Review step) from the config.
// Falls back to the provided static steps when the config isn't loaded.
export function buildSteps(
  flat: FlattenedConfig | null,
  staticSteps: DynamicStep[]
): DynamicStep[] {
  if (flat && flat.tabs.length) {
    return flat.tabs.map((t) => ({
      label: t.tab,
      key: dynamicStepKeyForTab(t.tab),
    }));
  }
  return staticSteps.map((s) => ({ label: s.label, key: s.key }));
}

// Generate the form.io components for a brand-new (non-static) tab, grouped by
// section, fields ordered by the backend `order`.
export function buildDynamicTabComponents(
  stepKey: string,
  flat: FlattenedConfig
): any[] {
  const tabName = tabNameFromStepKey(stepKey);
  const tab = flat.tabs.find((t) => t.tab === tabName);
  if (!tab) return [];

  const components: any[] = [];
  (tab.sections || []).forEach((section) => {
    const fields = [...(section.fields || [])].sort(
      (a, b) => (a.order || 0) - (b.order || 0)
    );
    if (!fields.length) return;
    if (section.section) {
      components.push({
        type: "htmlelement",
        tag: "div",
        className:
          "text-sm font-semibold text-slate-700 border-b border-slate-200 pb-1 mt-4 mb-2",
        content: section.section,
      });
    }
    fields.forEach((f) => components.push(generateComponent(f)));
  });
  return components;
}

// ---------------------------------------------------------------------------
// Submit payload helpers — extend the hardcoded payload with dynamic / newly-
// added backend fields, keyed by their backend fieldname, WITHOUT overriding any
// value the hardcoded mapping already produced.
// ---------------------------------------------------------------------------

// Every backend TAB field's value, keyed by backend fieldname, read from
// formData via the form-key mapping (an extra field's key is its fieldname).
export function collectDynamicTabValues(
  flat: FlattenedConfig | null,
  formData: any
): Record<string, any> {
  const out: Record<string, any> = {};
  if (!flat) return out;
  flat.tabs.forEach((tab) =>
    (tab.sections || []).forEach((section) =>
      (section.fields || []).forEach((field) => {
        // Child-group / count fields are handled by their own payload sections.
        if (KNOWN_CHILD_GROUP_FIELDS.has(field.fieldname)) return;
        const key = formKeyForFieldname(field.fieldname);
        const val = formData?.[key];
        if (val === undefined) return;
        out[field.fieldname] = val;
      })
    )
  );
  return out;
}

// Child-group columns the backend declares that aren't already mapped by hand in
// buildPayload — so a newly-added child column (e.g. on a Position row) can be
// merged into each row generically.
export function dynamicChildGroupFieldnames(
  flat: FlattenedConfig | null,
  childGroupKey: string,
  alreadyMapped: string[]
): string[] {
  const cg = flat?.childGroups?.[childGroupKey];
  if (!cg || !Array.isArray(cg.fields)) return [];
  const mapped = new Set(alreadyMapped);
  return cg.fields
    .map((f: BackendField) => f.fieldname)
    .filter((fn: string) => !mapped.has(fn));
}

// Merge dynamic values into a hardcoded payload object IN PLACE, adding ONLY
// fieldnames the hardcoded mapping doesn't already define (even if it set them
// to undefined). This keeps every known, specially-formatted field exactly as
// the hardcoded mapping produced it, and only appends genuinely-new fields.
export function mergeDynamicValues(
  payload: Record<string, any>,
  dynamic: Record<string, any>
): void {
  Object.keys(dynamic).forEach((fieldname) => {
    if (!(fieldname in payload)) {
      payload[fieldname] = dynamic[fieldname];
    }
  });
}

// Required-field gate rules for a dynamic tab, derived from its config (so the
// Next button still blocks on mandatory fields the backend declares). Field key
// is the backend fieldname (which is also the generated component's key).
export function requiredRulesForDynamicTab(
  stepKey: string,
  flat: FlattenedConfig | null
): { key: string; label: string }[] {
  if (!flat) return [];
  const tabName = tabNameFromStepKey(stepKey);
  const tab = flat.tabs.find((t) => t.tab === tabName);
  if (!tab) return [];
  const rules: { key: string; label: string }[] = [];
  (tab.sections || []).forEach((section) =>
    (section.fields || []).forEach((f) => {
      if (f.is_mandatory) rules.push({ key: f.fieldname, label: f.label });
    })
  );
  return rules;
}

// Required-field gate rules for a KNOWN tab (basicDetails / jobDetails /
// positionSelection / otherDetails), derived from the backend config so the Next
// button blocks on EVERY field the backend marks mandatory — not just the
// hardcoded gate list in RequisitionForm. Keys are mapped to the form-data key
// (so the value reads back correctly), and child-group / count fields are
// skipped (the Position table, qualifications, etc. carry their own validation).
// Returns [] when the config isn't loaded, preserving the static behavior.
export function requiredRulesForKnownTab(
  stepKey: string,
  flat: FlattenedConfig | null
): { key: string; label: string }[] {
  if (!flat) return [];
  const tabName = Object.keys(TAB_TO_STEP_KEY).find(
    (t) => TAB_TO_STEP_KEY[t] === stepKey
  );
  if (!tabName) return [];
  const tab = flat.tabs.find((t) => t.tab === tabName);
  if (!tab) return [];
  const rules: { key: string; label: string }[] = [];
  (tab.sections || []).forEach((section) =>
    (section.fields || []).forEach((f) => {
      if (!f.is_mandatory) return;
      if (KNOWN_CHILD_GROUP_FIELDS.has(f.fieldname)) return;
      // Functional Area is auto-derived (read-only) — never gate on it.
      if (AUTO_DERIVED_READONLY_FIELDS.has(f.fieldname)) return;
      rules.push({ key: formKeyForFieldname(f.fieldname), label: f.label });
    })
  );
  return rules;
}
