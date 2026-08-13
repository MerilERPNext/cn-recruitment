/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Form } from "@tsed/react-formio";
import FrappeAPI from "../../utils/frappeAPI";
import Button from "../shared/atoms/Button";
import { useCreateJobRequisition } from "../../hooks/useRecruitment";
import { useCurrentEmployeeDetails, useFileUpload } from "../../hooks/useEmployee";
import { useDeleteDocument } from "../../hooks/payroll/UseDeleteDocuemt";
import toast from "react-hot-toast";
import { Loader2, X, Check, AlertCircle } from "lucide-react";
import { IoMdCloudUpload } from "react-icons/io";
import RequisitionReviewStep from "./RequisitionReviewStep";
import PositionColumnCopyButtons from "./PositionColumnCopyButtons";
import BulkResumeUploadModal, { type UploadedResume } from "./BulkResumeUploadModal";
import "../../formio.custom.css";

// ---------------------------------------------------------------------------
// Types mirroring the backend API response
// ---------------------------------------------------------------------------
interface BackendField {
  fieldname: string;
  label: string;
  fieldtype: string;
  options?: string;
  is_mandatory?: number;
  read_only?: number;
  depends_on?: string;
  default?: any;
  order?: number;
  child_doctype?: string;
  child_fields?: BackendField[];
  is_nested_table?: number;
  nested_label?: string;
  nested_fields?: BackendField[];
}

interface BackendSection {
  section: string;
  fields: BackendField[];
}

interface BackendTab {
  tab: string;
  sections: BackendSection[];
}

interface FormConfig {
  settings?: string;
  hiring_type?: string;
  tabs: BackendTab[];
  child_groups?: Record<string, any>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const FIELDNAME_TO_FORM_KEY: Record<string, string> = {
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

const LINK_FIELD_DEPENDENCIES: Record<string, { filter: string; on: string; doctype?: string; customConditional?: string }> = {
  custom_employment_type_link: { filter: "&company={{ data.company }}", on: "company" },
  custom_location: { filter: "&custom_company={{ data.company }}", on: "company" },
  location: { filter: "&custom_company={{ data.company }}", on: "company" },
  employee_type: { filter: "&company={{ data.company }}", on: "company" },
  department: { filter: "&company={{ data.company }}&disabled=0", on: "company" },
  designation: { filter: "&custom_department={{ data.department }}&custom_status=Active", on: "department" },
  sub_location: {
    filter: "&branch={{ row.location }}",
    on: "location",
    doctype: "Sub Location",
    customConditional: "show = !!row.location",
  },
  custom_functional_area: { filter: "&designation={{ data.designation }}&disabled=0", on: "designation" },
  functional_area: { filter: "&designation={{ data.designation }}&disabled=0", on: "designation" },
};

const REQUISITION_SCOPE_FILTERED: Record<string, string> = {
  company: "&requisition_scope=1",
  department: "&requisition_scope=1&req_company={{ data.company }}",
  designation: "&requisition_scope=1&req_company={{ data.company }}&req_department={{ data.department }}",
};

function formKey(fieldname: string): string {
  return FIELDNAME_TO_FORM_KEY[fieldname] || fieldname;
}

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

type PositionCountKey =
  | "number_of_positions"
  | "number_of_new_positions"
  | "number_of_replacement_positions";

/** Keep the count fields and the position-detail rows as one consistent set. */
function applyPositionCounts(data: Record<string, any>, changedKey: PositionCountKey) {
  const total = Math.max(0, Number.parseInt(data.number_of_positions, 10) || 0);
  let newPositions = Math.max(0, Number.parseInt(data.number_of_new_positions, 10) || 0);
  let replacementPositions = Math.max(0, Number.parseInt(data.number_of_replacement_positions, 10) || 0);

  if (changedKey === "number_of_positions") {
    // A newly-entered total starts as entirely new positions.
    newPositions = total;
    replacementPositions = 0;
  } else if (changedKey === "number_of_new_positions") {
    newPositions = Math.min(newPositions, total);
    replacementPositions = total - newPositions;
  } else {
    replacementPositions = Math.min(replacementPositions, total);
    newPositions = total - replacementPositions;
  }

  const existingPositions = Array.isArray(data.positions) ? data.positions : [];
  const positions = Array.from({ length: total }, (_, index) => {
    const existing = existingPositions[index] || {};
    const isNew = index < newPositions;
    return {
      ...existing,
      position_number: index + 1,
      vacancy_type: isNew ? "New" : "Replacement",
      ...(isNew ? { replacement_for: "" } : {}),
      ...(data.functional_area
        ? {
            functional_area: data.functional_area,
            functional_area_title: data.functional_area_title || data.functional_area,
          }
        : {}),
    };
  });

  return {
    ...data,
    number_of_positions: total,
    number_of_new_positions: newPositions,
    number_of_replacement_positions: replacementPositions,
    positions,
  };
}

// ---------------------------------------------------------------------------
// Offline labels for url <select>s via submission.metadata.selectData.
// form.io renders a url-select's chosen value from
// submission.metadata.selectData without a network round-trip; without it a
// select that only holds a stored id renders the raw id (e.g. "ACD_TEACHING")
// until — or unless — its remote options load. We already carry the
// human-readable titles in `_title` fields, so map them into the metadata
// shape form.io expects (top-level keys + the positions datagrid rows).
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
];

const POSITION_SELECT_TITLE_KEYS: [string, string][] = [
  ["location", "location_title"],
  ["sub_location", "sub_location_title"],
  ["functional_area", "functional_area_title"],
  ["reporting_manager", "reporting_manager_title"],
  ["replacement_for", "replacement_for_title"],
  ["employee_type", "employee_type_title"],
];

function buildSelectData(data: Record<string, any>): Record<string, any> {
  const sd: Record<string, any> = {};
  const opt = (id: any, label: any) => ({ id, value: id, label });

  SINGLE_SELECT_TITLE_KEYS.forEach(([key, titleKey]) => {
    const id = data?.[key];
    const label = data?.[titleKey];
    if (id && label) sd[key] = opt(id, label);
  });

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
// Generate Form.io Component Schema
// ---------------------------------------------------------------------------
function generateFormioComponent(field: BackendField, inGrid = false): any {
  const required = Boolean(field.is_mandatory);
  const isPositionFunctionalArea = inGrid && field.fieldname === "functional_area";
  const base: any = {
    key: formKey(field.fieldname),
    label: field.label || field.fieldname,
    input: true,
    // Datagrid-required markers belong on the column header, not on every
    // cell's label.
    customClass: required && !inGrid ? "required-field" : undefined,
    disabled: field.read_only || isPositionFunctionalArea ? true : undefined,
    validate: { required: isPositionFunctionalArea ? false : required },
    ...(field.default !== undefined && field.default !== "" ? { defaultValue: field.default } : {}),
  };

  if (field.depends_on) {
    let expr = field.depends_on.replace(/^eval:\s*/i, "");
    expr = expr.replace(/(?:doc|data)\.([\w]+)/g, (_, key) => {
      if (inGrid) {
        // Backend Position Details conditions refer to the old requisition
        // field name. In this grid the controlling value is the row's
        // Vacancy Type instead.
        if (key === "custom_type_of_position") return "row.vacancy_type";
        return `row.${formKey(key)}`;
      }
      const fk = formKey(key);
      return `data.${fk}`;
    });
    base.customConditional = `show = (${expr});`;
  }

  if (field.fieldname === "designation") {
    base.logic = [
      {
        name: "Disable if no department",
        trigger: { type: "javascript", javascript: "result = !data.department;" },
        actions: [
          {
            name: "Disable",
            type: "property",
            property: { label: "Disabled", value: "disabled", type: "boolean" },
            state: true
          }
        ]
      }
    ];
  }

  if (field.fieldname === "no_of_positions") {
    return {
      type: "columns",
      isFullWidth: true,
      columns: [
        {
          width: 6,
          components: [
            {
              ...base,
              type: "number",
              key: "number_of_positions",
              label: field.label || "Total Position",
              validate: { required: true, min: 1 },
            }
          ]
        },
        {
          width: 3,
          components: [
            {
              type: "number",
              key: "number_of_new_positions",
              label: "New",
              input: true,
              validate: { required: true, min: 0 },
              customConditional: "show = !!data.number_of_positions;",
            }
          ]
        },
        {
          width: 3,
          components: [
            {
              type: "number",
              key: "number_of_replacement_positions",
              label: "Replacement",
              input: true,
              validate: { required: true, min: 0 },
              customConditional: "show = !!data.number_of_positions;",
            }
          ]
        }
      ]
    };
  }

  if (field.fieldname === "custom_functional_area") {
    return [
      {
        key: "functional_area",
        type: "hidden",
        input: true
      },
      {
        key: "functional_area_title",
        type: "textfield",
        label: field.label || "Functional Area",
        input: true,
        disabled: true,
        validate: { required: false }
      }
    ];
  }

  if (field.fieldname === "custom_experience_unit" && !base.defaultValue) {
    base.defaultValue = "years";
  }

  if (field.fieldname === "custom_salary_range_currency" && !base.defaultValue) {
    base.defaultValue = "INR";
  }

  if (field.fieldname === "custom_salary_timeframe" && !base.defaultValue) {
    base.defaultValue = "Annual";
  }

  if (field.fieldname === "vacancy_type" && !base.defaultValue) {
    base.defaultValue = "New";
  }

  switch (field.fieldtype) {
    case "Link": {
      const dependency = LINK_FIELD_DEPENDENCIES[field.fieldname];
      const linkDoctype = dependency?.doctype || field.options || "";
      const activeEmployeeFilter = linkDoctype === "Employee" ? "&status=Active" : "";
      const scopeFilter = REQUISITION_SCOPE_FILTERED[field.fieldname] || "";

      return {
        ...base,
        type: "select",
        placeholder: isPositionFunctionalArea ? "Auto-filled from Designation" : `Select ${field.label}`,
        dataSrc: "url",
        data: {
          url: `/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=${linkDoctype}${dependency?.filter || ""}${activeEmployeeFilter}${scopeFilter}`,
          headers: [{ key: "Accept", value: "application/json" }],
        },
        selectValues: "message.results",
        valueProperty: "id",
        template: (field.fieldname === "designation" || field.options === "Employee")
          ? `<span>{{ item.label || ${inGrid ? `row.${formKey(field.fieldname)}_title` : `data.${formKey(field.fieldname)}_title`} || item.id || item }} <span style='color:#7f8c8d'>({{ item.id || item }})</span></span>`
          : `<span>{{ item.label || ${inGrid ? `row.${formKey(field.fieldname)}_title` : `data.${formKey(field.fieldname)}_title`} || item.id || item }}</span>`,
        limit: 20,
        lazyLoad: false,
        searchField: "search_text",
        ...(dependency ? {
            refreshOn: dependency.on,
            clearOnRefresh: true,
            clearOnHide: true,
            ...(dependency.customConditional ? { customConditional: dependency.customConditional } : {}),
        } : {}),
      };
    }

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
        format: "dd-MM-yyyy", 
        enableDate: true, 
        enableTime: false,
        ...(field.fieldname === "posting_date" ? { customDefaultValue: "value = data.recruitment_start_date ? data.recruitment_start_date : moment().format('YYYY-MM-DD');" } : {})
      };

    case "Datetime":
      return { ...base, type: "datetime", format: "yyyy-MM-dd HH:mm", enableDate: true, enableTime: true };

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

    case "Table MultiSelect": {
      const childField = field.child_fields?.[0];
      const linkDoctype = childField?.options || "";
      const scopeFilter = REQUISITION_SCOPE_FILTERED[field.fieldname] || "";

      return {
        ...base,
        type: "select",
        multiple: true,
        placeholder: `Select ${field.label}`,
        dataSrc: "url",
        data: {
          url: `/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=${linkDoctype}${scopeFilter}`,
          headers: [{ key: "Accept", value: "application/json" }],
        },
        selectValues: "message.results",
        valueProperty: "id",
        template: "<span>{{ item.label || item.id || item }}</span>",
        limit: 50,
      };
    }

    case "Table": {
      const isPositionDetails = field.fieldname === "custom_position_details" || field.fieldname === "positions";
      const sortedChildFields = [...(field.child_fields || [])]
        .sort((a, b) => (a.order || 0) - (b.order || 0))
      let childComponents = sortedChildFields.map(childField => {
        if (!childField.is_nested_table) {
          // Every column lives inside a datagrid row, so treat it as in-grid:
          // the required marker belongs on the column header (rendered from
          // `validate.required`), not on each cell's label.
          return generateFormioComponent(childField, true);
        }
        return {
          type: "datagrid",
          key: childField.fieldname,
          label: childField.nested_label || childField.label,
          input: true,
          addAnother: `Add ${childField.nested_label || "Row"}`,
          removeRow: "Remove",
          reorder: false,
          validate: { required: Boolean(childField.is_mandatory) },
          components: (childField.nested_fields || [])
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(nestedField => generateFormioComponent(nestedField, true)),
        };
      });

      if (isPositionDetails) {
        const existingPos = childComponents.findIndex(c => c.key === "position_number");
        const posComp = existingPos > -1 ? childComponents.splice(existingPos, 1)[0] : {
          type: "number",
          key: "position_number",
          label: "Position Number",
          disabled: true,
          input: true
        };
        posComp.disabled = true;

        const existingVac = childComponents.findIndex(c => c.key === "vacancy_type");
        const vacComp = existingVac > -1 ? childComponents.splice(existingVac, 1)[0] : {
          type: "select",
          key: "vacancy_type",
          label: "Vacancy Type",
          data: {
            values: [
              { label: "New", value: "New" },
              { label: "Replacement", value: "Replacement" },
            ],
          },
          defaultValue: "New",
          validate: { required: true },
          input: true
        };

        childComponents = [posComp, vacComp, ...childComponents];
      }

      return {
        ...base,
        type: "datagrid",
        initEmpty: isPositionDetails,
        disableAddingRemovingRows: isPositionDetails,
        addAnother: isPositionDetails ? "" : "Add Row",
        removeRow: isPositionDetails ? "" : "Remove",
        components: childComponents,
      };
    }

    case "Attach":
    case "Attach Image":
      return { ...base, type: "textfield", placeholder: "File URL" };

    case "Data":
    default:
      return { ...base, type: "textfield", placeholder: field.label };
  }
}

// ---------------------------------------------------------------------------
// Build Schemas from Config
// ---------------------------------------------------------------------------
function buildTabSchemas(config: FormConfig) {
  const schemas: any[] = [];
  const steps: string[] = [];

  config.tabs.forEach((tab) => {
    steps.push(tab.tab);
    const components: any[] = [];

    if (/position/i.test(tab.tab)) {
      components.push({
        type: "htmlelement",
        tag: "div",
        className: "flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 text-blue-800 px-3 py-2.5 mb-3 text-sm",
        content: '<i class="fa fa-info-circle mt-0.5 text-blue-500"></i><span><strong>Note:</strong> Create a separate requisition for each different work location. If multiple positions belong to the same location, they should be included within a single requisition.</span>',
      });
    }

    tab.sections.forEach((section) => {
      const sortedFields = [...(section.fields || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
      if (sortedFields.length === 0) return;

      const sectionComponents: any[] = [];

      const columnsComponent = {
        type: "columns",
        columns: [
          { components: [] as any[], width: 6 },
          { components: [] as any[], width: 6 }
        ]
      };

      sortedFields.forEach((field) => {
        // Position counts are controlled React inputs below the Form.io grid.
        // Form.io redraws can otherwise overwrite the calculated companion
        // value (New / Replacement) while the user is typing.
        if (field.fieldname === "no_of_positions") return;
        // Pre-Screened Candidates is rendered as a custom React table (with
        // inline file upload + bulk resume upload) outside Form.io.
        if (field.fieldname === "custom_pre_screened_candidates") return;

        const generated = generateFormioComponent(field);
        const comps = Array.isArray(generated) ? generated : [generated];

        comps.forEach(comp => {
          if (comp.type === "hidden") {
            sectionComponents.push(comp);
            return;
          }
          if (comp.isFullWidth || field.fieldtype === "Table" || field.fieldtype === "Table MultiSelect" || field.fieldtype === "Long Text" || field.fieldtype === "Text Editor") {
            if (columnsComponent.columns[0].components.length > 0 || columnsComponent.columns[1].components.length > 0) {
              sectionComponents.push(JSON.parse(JSON.stringify(columnsComponent)));
              columnsComponent.columns[0].components = [];
              columnsComponent.columns[1].components = [];
            }
            sectionComponents.push(comp);
          } else {
            const colIndex = (columnsComponent.columns[0].components.length <= columnsComponent.columns[1].components.length) ? 0 : 1;
            columnsComponent.columns[colIndex].components.push(comp);
          }
        });
      });

      if (columnsComponent.columns[0].components.length > 0 || columnsComponent.columns[1].components.length > 0) {
        sectionComponents.push(columnsComponent);
      }

      // A section whose only field(s) are custom-rendered (e.g. Pre-Screened
      // Candidates) has nothing to draw here.
      if (sectionComponents.length === 0) return;

      if (section.section) {
        if (/recruiter instruction/i.test(section.section)) {
          components.push({
            type: "htmlelement",
            tag: "div",
            className: "alert alert-info mt-4 mb-2 rounded-md",
            content: '<i class="fa fa-info-circle mr-2"></i> Fill below sections if you have any specific instruction for recruiters'
          });
        }

        components.push({
          type: "panel",
          title: section.section,
          theme: "default",
          customClass: "bg-gray-50 border border-gray-200 rounded-lg shadow-sm mb-6",
          components: sectionComponents
        });
      } else {
        components.push(...sectionComponents);
      }
    });

    schemas.push({ display: "form", components });
  });

  steps.push("Review");
  return { schemas, steps };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const RequisitionFormV2 = () => {
  const navigate = useNavigate();
  const createJobRequisition = useCreateJobRequisition();
  const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });

  const [config, setConfig] = useState<FormConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  // Dedicated state for hiring type so the config-fetch effect doesn't
  // double-fire (undefined → default "Lateral" on mount, then the user's
  // selection).  Initialised to "Lateral" so only one fetch happens on mount.
  const [hiringType, setHiringType] = useState("Lateral");
  // Track whether the initial config has been loaded.  Subsequent re-fetches
  // (triggered by hiring-type change) should NOT unmount the form.
  const [initialConfigLoaded, setInitialConfigLoaded] = useState(false);
  
  const [schemas, setSchemas] = useState<any[]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [currentTab, setCurrentTab] = useState(0);
  
  const [formData, setFormData] = useState<Record<string, any>>({});
  const formDataRef = useRef(formData);
  formDataRef.current = formData;
  
  const [formSyncTick, setFormSyncTick] = useState(0);
  const [positionCountDrafts, setPositionCountDrafts] = useState<Partial<Record<PositionCountKey, string>>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [jobDetailsPreviewOpen, setJobDetailsPreviewOpen] = useState(false);
  const [jobDetailsPreview, setJobDetailsPreview] = useState<{ loading: boolean; title: string; source: string; html: string; payload?: any }>({
    loading: false, title: "", source: "", html: ""
  });
  
  const formInstanceRef = useRef<any>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const prefilledJdKeyRef = useRef<string>("");

  const formSubmission = useMemo(
    () => ({
      data: formDataRef.current,
      // Offline labels so url-selects render titles instantly (no raw-id flash
      // like "ACD_TEACHING" in the Position Details Functional Area column).
      metadata: { selectData: buildSelectData(formDataRef.current) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formSyncTick, currentTab]
  );
  const isLastStep = currentTab === steps.length - 1;
  const isReviewStep = steps[currentTab] === "Review";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Only show the full-page loading spinner on the very first fetch.
      // Subsequent fetches (hiring-type change) update schemas in-place
      // without unmounting the form, which avoids the page "splash".
      if (!initialConfigLoaded) setConfigLoading(true);
      try {
        const res: any = await FrappeAPI.callMethod(
          "recruitment.api.job_requisition.get_job_requisition_form_config",
          { hiring_type: hiringType }
        );
        if (!cancelled) {
          const data = res?.data || res;
          if (data && Array.isArray(data.tabs)) {
            setConfig(data);
            const { schemas: newSchemas, steps: newSteps } = buildTabSchemas(data);
            setSchemas(newSchemas);
            setSteps(newSteps);
            // Sync formData so the form.io submission reflects the current
            // hiring type (prevents the dropdown from resetting to the
            // field's default value during re-initialisation).
            setFormData(prev => ({ ...prev, custom_hiring_type: hiringType }));
            setFormSyncTick(t => t + 1);
          } else {
            setConfigError("Invalid form configuration received.");
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load form config:", err);
          setConfigError("Failed to load form configuration.");
        }
      } finally {
        if (!cancelled) {
          setConfigLoading(false);
          setInitialConfigLoaded(true);
        }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiringType]);

  useEffect(() => {
    if (currentEmployee?.name && !formData.hiring_manager) {
      setFormData((prev) => ({
        ...prev,
        hiring_manager: currentEmployee.name,
        company: currentEmployee.company,
      }));
      setFormSyncTick((t) => t + 1);
    }
  }, [currentEmployee, formData.hiring_manager]);

  const autoFillFunctionalArea = useCallback(async (designation: string) => {
    try {
      const desigRes: any = await FrappeAPI.callMethod("frappe.client.get_value", {
        doctype: "Designation",
        filters: designation,
        fieldname: "custom_functional_area",
      });
      const faId: string = desigRes?.custom_functional_area || "";
      let faTitle = faId;
      if (faId) {
        try {
          const opts: any = await FrappeAPI.callMethod(
            "recruitment.api.job_requisition.get_link_field_options",
            { doctype: "Functional Area", include: faId, limit: 1 }
          );
          const match = (opts?.results || []).find((r: any) => r.id === faId);
          if (match?.label) faTitle = match.label;
        } catch {}
      }
      setFormData((prev: any) => {
        if (prev.designation !== designation) return prev;
        const next = {
          ...prev,
          functional_area: faId,
          positions: (prev.positions || []).map((position: any) => ({
            ...position,
            functional_area: faId,
            functional_area_title: faTitle,
          })),
        };
        if (faTitle) next.functional_area_title = faTitle;
        else delete next.functional_area_title;
        return next;
      });
      setFormSyncTick(t => t + 1);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    const activeTabName = steps[currentTab];
    if (activeTabName !== "Job Details") return;
    
    const currentData = formDataRef.current as any;
    const designationId = currentData.designation;
    const departmentId = currentData.department;
    if (!designationId || !departmentId) return;

    const currentKey = `${designationId}-${departmentId}`;
    if (prefilledJdKeyRef.current === currentKey) return;
    prefilledJdKeyRef.current = currentKey;

    const fetchAndPrefill = async () => {
      const designationTitle = currentData.designation_title || designationId;
      const departmentTitle = currentData.department_title || departmentId;
      const functional_area = currentData.functional_area_title || currentData.functional_area;

      const payload: Record<string, any> = {};
      config?.tabs.forEach(tab => tab.sections.forEach(section => section.fields.forEach(f => {
        if (currentData[formKey(f.fieldname)] !== undefined) {
          payload[f.fieldname] = currentData[formKey(f.fieldname)];
        }
      })));

      try {
        const res: any = await FrappeAPI.callMethod(
          "recruitment.api.job_requisition.preview_job_description",
          { designation: designationTitle, department: departmentTitle, functional_area, data: payload }
        );
        const jd = res?.data ?? res ?? {};
        const html = jd?.description_html || jd?.description || "";
        const prefill = jd?.prefill || {};
        const noJd = jd?.source === "none" || !html;

        if (!noJd || Object.keys(prefill).length > 0) {
          setFormData((prev: any) => {
            const updates: any = {};
            if (!noJd) {
              updates.description = html;
              updates.job_description_template = html;
            }
            if (jd?.skills && !prev.custom_skills) {
              updates.custom_skills = jd.skills;
            }
            
            Object.entries(prefill).forEach(([k, v]) => {
              const fk = formKey(k);
              const prevVal = prev[fk];
              const isEmpty = prevVal === undefined || prevVal === null || prevVal === "" || (Array.isArray(prevVal) && prevVal.length === 0);
              if (isEmpty) {
                updates[fk] = v;
              }
            });
            if (Object.keys(updates).length > 0) return { ...prev, ...updates };
            return prev;
          });
          setFormSyncTick(t => t + 1);
        }
      } catch (e) {
        console.error("Failed to auto-fetch JD", e);
        prefilledJdKeyRef.current = "";
      }
    };
    fetchAndPrefill();
  }, [currentTab, steps, config]);

  const handleChange = (changed: any) => {
    const newData = { ...formDataRef.current, ...changed.data };
    const changedKey = changed.changed?.component?.key;

    // Update the dedicated hiringType state when the user explicitly changes
    // the hiring type dropdown.  This triggers a config re-fetch via the
    // useEffect that depends on hiringType.  The guard !== hiringType prevents
    // a re-fetch when the value hasn't actually changed (e.g. form.io echoing
    // the same default value during initialisation).
    if (changedKey === "custom_hiring_type" && newData.custom_hiring_type && newData.custom_hiring_type !== hiringType) {
      setHiringType(newData.custom_hiring_type);
    } else if (changedKey !== "custom_hiring_type") {
      // When the change is NOT a direct user interaction with the hiring type
      // dropdown, preserve the hiringType state as the source of truth.
      // This prevents form.io re-initialisation from overwriting the value
      // with the field's default ("Lateral") via the changed.data spread.
      newData.custom_hiring_type = hiringType;
    }
    const positionCountsChanged =
      changedKey === "number_of_positions" ||
      changedKey === "number_of_new_positions" ||
      changedKey === "number_of_replacement_positions";
    if (changedKey === "designation") {
      if (newData.designation) {
        void autoFillFunctionalArea(newData.designation);
      } else {
        newData.functional_area = "";
        delete newData.functional_area_title;
      }
    }

    if (positionCountsChanged) {
      const normalized = applyPositionCounts(newData, changedKey);
      Object.assign(newData, normalized);

      if (formInstanceRef.current) {
        setTimeout(() => {
          try {
             if (changedKey !== "number_of_new_positions") {
               const newComp = formInstanceRef.current.getComponent("number_of_new_positions");
               if (newComp) newComp.setValue(normalized.number_of_new_positions);
             }
             if (changedKey !== "number_of_replacement_positions") {
               const repComp = formInstanceRef.current.getComponent("number_of_replacement_positions");
               if (repComp) repComp.setValue(normalized.number_of_replacement_positions);
             }
             const positionsComp = formInstanceRef.current.getComponent("positions");
             if (positionsComp) positionsComp.setValue(normalized.positions);

             // Force UI redraw for the grid and numbers if needed
             formInstanceRef.current.redraw();
          } catch(e) {}
        }, 100);
      }
    }

    if (changedKey === "positions") {
      const positions = Array.isArray(newData.positions) ? newData.positions : [];
      newData.number_of_positions = positions.length;
      newData.number_of_new_positions = positions.filter((position: any) => position?.vacancy_type === "New").length;
      newData.number_of_replacement_positions = positions.filter((position: any) => position?.vacancy_type === "Replacement").length;
    }
    
    const selectData = changed.metadata?.selectData;
    if (selectData && typeof selectData === "object") {
      const labelOf = (v: any) => v && typeof v === "object" ? (v.label ?? v.name ?? v.title) : undefined;
      Object.keys(selectData).forEach((key) => {
        const sd = selectData[key];
        if (key === "positions" && Array.isArray(sd)) {
          const rows = [...(newData.positions || [])];
          sd.forEach((rowSelectData: any, index: number) => {
            if (!rows[index] || !rowSelectData || typeof rowSelectData !== "object") return;
            const row = { ...rows[index] };
            Object.entries(rowSelectData).forEach(([fieldKey, selected]) => {
              const label = labelOf(selected);
              if (label) row[`${fieldKey}_title`] = label;
              else if (!row[fieldKey]) delete row[`${fieldKey}_title`];
            });
            rows[index] = row;
          });
          newData.positions = rows;
        } else if (Array.isArray(sd)) {
          const labels = sd.map((v: any) => labelOf(v)).filter(Boolean);
          if (labels.length) newData[`${key}_title`] = labels;
          else delete newData[`${key}_title`];
        } else if (sd && typeof sd === "object" && !("label" in sd || "name" in sd || "title" in sd)) {
           const labels = Object.values(sd).map((v: any) => labelOf(v)).filter(Boolean);
           if (labels.length) newData[`${key}_title`] = labels;
           else delete newData[`${key}_title`];
        } else {
           const lbl = labelOf(sd);
           if (lbl) newData[`${key}_title`] = lbl;
           else delete newData[`${key}_title`];
        }
      });
    }

    setFormData(newData);
    // The count controls are programmatically updated, so re-feed their
    // normalized values to Form.io once the state change has been committed.
    if (positionCountsChanged) setFormSyncTick((tick) => tick + 1);
    setValidationErrors([]);
  };

  const handlePositionCountChange = (changedKey: PositionCountKey, value: string) => {
    // Preserve an empty field while the user is editing; the normalized state
    // still keeps the table and companion count in sync underneath.
    setPositionCountDrafts((drafts) => ({ ...drafts, [changedKey]: value }));
    const normalized = applyPositionCounts(
      { ...formDataRef.current, [changedKey]: value },
      changedKey
    );
    setFormData(normalized);
    setFormSyncTick((tick) => tick + 1);
    setValidationErrors([]);
  };

  const commitPositionCount = (key: PositionCountKey) => {
    setPositionCountDrafts((drafts) => {
      if (drafts[key] === undefined) return drafts;
      const next = { ...drafts };
      delete next[key];
      return next;
    });
  };

  const positionCountValue = (key: PositionCountKey) => {
    if (positionCountDrafts[key] !== undefined) return positionCountDrafts[key];
    const value = formData[key];
    return value === undefined || value === null ? "" : value;
  };

  const copyColumnToAllPositions = useCallback((fieldKey: string) => {
    const positions = formDataRef.current.positions || [];
    const source = positions.find((position: any) => {
      const value = position?.[fieldKey];
      return value !== undefined && value !== null && value !== "";
    });
    if (!source) return;

    setFormData((current) => ({
      ...current,
      positions: (current.positions || []).map((position: any) => ({
        ...position,
        [fieldKey]: source[fieldKey],
        ...(source[`${fieldKey}_title`] !== undefined
          ? { [`${fieldKey}_title`]: source[`${fieldKey}_title`] }
          : {}),
      })),
    }));
    setFormSyncTick((tick) => tick + 1);
  }, []);

  // ── Pre-Screened Candidates (custom table, same as RequisitionForm) ──────
  const uploadMutation = useFileUpload();
  const { mutateAsync: deleteDoc } = useDeleteDocument();
  const [candidateFileNames, setCandidateFileNames] = useState<Record<number, string>>({});
  const [candidateFileIds, setCandidateFileIds] = useState<Record<number, string>>({});
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

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

  const handleBulkResumesUploaded = (results: UploadedResume[]) => {
    if (!results.length) return;
    const base = (formDataRef.current?.custom_pre_screened_candidates || []).length;
    const newRows = results.map((r) => ({
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

  // ── Qualifications (custom table driven by child_groups config) ──────────
  const qualificationFields =
    config?.child_groups?.custom_qualifications?.fields || [];
  const hasQualifications = qualificationFields.length > 0;

  // ── Position counts (only when the config includes no_of_positions) ─────
  const hasPositionCounts = useMemo(() => {
    if (!config) return false;
    return config.tabs.some(tab =>
      tab.sections.some(section =>
        section.fields.some(f => f.fieldname === "no_of_positions")
      )
    );
  }, [config]);

  const addQualification = () => {
    const mandatoryField = qualificationFields.find(
      (f: any) => f.fieldname === "mandatory"
    );
    const firstOption = ((mandatoryField?.options as string) || "")
      .split("\n")
      .filter(Boolean)[0];
    setFormData((prev: any) => ({
      ...prev,
      custom_qualifications: [
        ...(prev.custom_qualifications || []),
        {
          qualification: "",
          mandatory: firstOption || "",
        },
      ],
    }));
  };

  const removeQualification = (index: number) => {
    setFormData((prev: any) => {
      const quals = [...(prev.custom_qualifications || [])];
      quals.splice(index, 1);
      return { ...prev, custom_qualifications: quals };
    });
  };

  const updateQualificationField = (index: number, field: string, value: any) => {
    setFormData((prev: any) => {
      const quals = [...(prev.custom_qualifications || [])];
      if (!quals[index]) return prev;
      quals[index] = { ...quals[index], [field]: value };
      return { ...prev, custom_qualifications: quals };
    });
  };

  const validateCurrentTab = (): string[] => {
    if (!config) return [];
    const errors: string[] = [];
    const currentTabConfig = config.tabs[currentTab];
    const data = formDataRef.current as any;
    
    currentTabConfig.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.depends_on) {
          try {
             let expr = field.depends_on.replace(/^eval:\s*/i, "");
             expr = expr.replace(/(?:doc|data)\.([\w]+)/g, (_, key) => `data.${formKey(key)}`);
             const isVisible = new Function("data", `return !!(${expr});`)(data);
             if (!isVisible) return;
          } catch(e) {}
        }

        if (field.is_mandatory && field.fieldname !== "custom_functional_area") {
          const fk = formKey(field.fieldname);
          const val = data[fk];
          if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
            errors.push(`${field.label || field.fieldname} is required.`);
          }
        }
      });
    });

    if (/position/i.test(currentTabConfig.tab) && hasPositionCounts) {
      const total = Number(data.number_of_positions) || 0;
      const newPositions = Number(data.number_of_new_positions) || 0;
      const replacementPositions = Number(data.number_of_replacement_positions) || 0;
      const positions = Array.isArray(data.positions) ? data.positions : [];

      if (total < 1) errors.push("No of. Positions must be at least 1.");
      if (newPositions + replacementPositions !== total) {
        errors.push("New and Replacement positions must equal No of. Positions.");
      }
      if (positions.length !== total) {
        errors.push("Vacancy Details must contain one row for every position.");
      }
      const positionTable = currentTabConfig.sections
        .flatMap((section) => section.fields)
        .find((field) => field.fieldname === "custom_position_details");
      (positionTable?.child_fields || []).forEach((field) => {
        if (field.is_nested_table) {
          // Nested table (e.g. Cost Center Allocations): the backend marks the
          // individual nested columns mandatory, so the table itself must be
          // filled — at least one allocation row with content, and every filled
          // row must complete each mandatory nested column.
          const mandatoryNested = (field.nested_fields || []).filter(
            (nestedField) => Boolean(nestedField.is_mandatory)
          );
          if (mandatoryNested.length === 0) return;
          const isFilled = (v: any) =>
            v !== undefined && v !== null && v !== "";
          positions.forEach((position: any, index: number) => {
            const allocations = Array.isArray(position[field.fieldname])
              ? position[field.fieldname]
              : [];
            const filledAllocations = allocations.filter(
              (allocation: any) =>
                allocation &&
                typeof allocation === "object" &&
                Object.values(allocation).some((v) => isFilled(v))
            );
            if (filledAllocations.length === 0) {
              errors.push(
                `Position ${index + 1}: ${field.label || field.fieldname} is required.`
              );
              return;
            }
            filledAllocations.forEach((allocation: any, allocIndex: number) => {
              mandatoryNested.forEach((nestedField) => {
                const value = allocation[nestedField.fieldname];
                if (!isFilled(value)) {
                  errors.push(
                    `Position ${index + 1} (Allocation ${allocIndex + 1}): ${nestedField.label || nestedField.fieldname} is required.`
                  );
                }
              });
            });
          });
          return;
        }
        if (!field.is_mandatory) return;
        positions.forEach((position: any, index: number) => {
          if (field.depends_on?.includes("custom_type_of_position") && position.vacancy_type !== "Replacement") return;
          const value = position[field.fieldname];
          if (value === undefined || value === null || value === "") {
            errors.push(`Position ${index + 1}: ${field.label || field.fieldname} is required.`);
          }
        });
      });
    }

    // Other Details: validate Qualifications rows — config-gated on the child
    // group existing, mirroring RequisitionForm's qualConfigured behaviour.
    if (hasQualifications && /other details/i.test(currentTabConfig.tab)) {
      const quals: any[] = data.custom_qualifications || [];
      quals.forEach((q: any, i: number) => {
        qualificationFields.forEach((field: any) => {
          if (!field.is_mandatory) return;
          const value = q?.[field.fieldname];
          if (value === undefined || value === null || value === "") {
            errors.push(
              `Qualification ${i + 1}: ${field.label || field.fieldname} is required.`
            );
          }
        });
      });
    }

    return errors;
  };

  const handleNext = () => {
    const errors = validateCurrentTab();
    if (errors.length > 0) {
      setValidationErrors(errors);
      if (formInstanceRef.current) {
        formInstanceRef.current.checkValidity(formSubmission.data, true, formSubmission.data);
      }
      setTimeout(() => {
        const firstError = document.querySelector('.formio-error-wrapper, .has-error, .required-field');
        if (firstError) {
          firstError.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 50);
      return;
    }

    setValidationErrors([]);
    setCurrentTab((prev) => Math.min(prev + 1, steps.length - 1));
    setFormSyncTick(t => t + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevious = () => {
    setValidationErrors([]);
    setCurrentTab((prev) => Math.max(prev - 1, 0));
    setFormSyncTick(t => t + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTabClick = (idx: number) => {
    if (idx > currentTab) {
      // Moving forward: validate current tab first
      const errors = validateCurrentTab();
      if (errors.length > 0) {
        setValidationErrors(errors);
        if (formInstanceRef.current) {
          formInstanceRef.current.checkValidity(formSubmission.data, true, formSubmission.data);
        }
        setTimeout(() => {
          const firstError = document.querySelector('.formio-error-wrapper, .has-error, .required-field');
          if (firstError) {
            firstError.scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }, 50);
        return;
      }
    }
    
    setValidationErrors([]);
    setCurrentTab(idx);
    setFormSyncTick(t => t + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePreviewJobDetails = async () => {
    const currentData = formDataRef.current;
    const designation = currentData.designation_title || currentData.designation;
    const department = currentData.department_title || currentData.department;
    const functional_area = currentData.functional_area_title || currentData.functional_area;

    if (!designation || !department) {
      toast.error("Please select Designation and Department first.");
      return;
    }

    const escapeHtml = (s: any) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

    setJobDetailsPreview({ loading: true, title: "", source: "", html: "" });
    setJobDetailsPreviewOpen(true);

    try {
      const payload: Record<string, any> = {};
      config?.tabs.forEach(tab => tab.sections.forEach(section => section.fields.forEach(f => {
        if (currentData[formKey(f.fieldname)] !== undefined) {
          payload[f.fieldname] = currentData[formKey(f.fieldname)];
        }
      })));
      
      const res: any = await FrappeAPI.callMethod("recruitment.api.job_requisition.preview_job_description", {
        designation, department, functional_area, data: payload
      });

      const jd = res?.data ?? res ?? {};
      const html = jd?.description_html || jd?.description || "";
      const noJd = jd?.source === "none" || !html;

      setJobDetailsPreview(prev => ({
        ...prev,
        loading: false,
        title: jd?.title || jd?.name || "",
        source: jd?.source || "",
        html: noJd ? `<p style="color:#6b7280;text-align:center;padding:32px 0;">No job description found for <strong>${escapeHtml(designation)}</strong> in <strong>${escapeHtml(department)}</strong>.</p>` : html,
      }));
    } catch (err) {
      console.error(err);
      setJobDetailsPreview(prev => ({
        ...prev,
        loading: false,
        html: `<p style="color:#ef4444;text-align:center;padding:32px 0;">Failed to load job description.</p>`
      }));
    }
  };

  const handleSubmit = async () => {
    setIsBusy(true);
    try {
      const payload: Record<string, any> = {};
      
      // Collect all configured fields
      config?.tabs.forEach(tab => {
        tab.sections.forEach(section => {
          section.fields.forEach(field => {
            const k = formKey(field.fieldname);
            if (formData[k] !== undefined) {
              payload[field.fieldname] = formData[k];
            }
          });
        });
      });
      
      // Standard mappings for API
      payload.requested_by = formData.hiring_manager;
      payload.company = formData.company;
      payload.department = formData.department;
      payload.designation = formData.designation;
      payload.posting_date = toBackendDate(formData.recruitment_start_date);
      payload.no_of_positions = formData.number_of_positions || 1;
      payload.custom_hiring_type = hiringType;

      // Qualifications is a child group (absent from the tabs), so collect it
      // explicitly — the backend ignores rows without a qualification.
      payload.custom_qualifications = (formData.custom_qualifications || [])
        .filter((q: any) => q?.qualification?.trim())
        .map((q: any) => ({
          qualification: q.qualification,
          mandatory: q.mandatory || "Required",
        }));

      payload.custom_salary_range_currency = formData.salary_currency;
      payload.custom_salary_range_min = formData.salary_min;
      payload.custom_salary_range_max = formData.salary_max;
      payload.custom_salary_timeframe = formData.salary_timeframe;
      payload.custom_position_details = (formData.positions || []).map(
        ({ position_number: _positionNumber, cost_center_allocations, ...position }: Record<string, any>) => ({
          ...Object.fromEntries(Object.entries(position).filter(([key]) => !key.endsWith("_title"))),
          ...(Array.isArray(cost_center_allocations)
            ? {
                cost_center_allocations: cost_center_allocations.map((allocation: any) => ({
                  cost_center: allocation.cost_center,
                  percentage: allocation.percentage,
                })),
              }
            : {}),
        })
      );

      await createJobRequisition.mutateAsync(payload as any);
      toast.success("Job Requisition created successfully!");
      navigate("/webapp/recruitment/requisition");
    } catch (err: any) {
      console.error("Submit failed:", err);
      toast.error("Failed to create requisition.");
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (!tabBarRef.current) return;
    const activeBtn = tabBarRef.current.querySelector('[data-active="true"]');
    if (activeBtn) activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [currentTab]);

  if (configLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="animate-spin text-primary-500" />
        <span className="text-sm text-gray-500">Loading form configuration...</span>
      </div>
    );
  }

  if (configError || !config) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-6">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-gray-600 text-center">{configError || "Unable to load form."}</p>
        <Button variant="outline" onClick={() => window.location.reload()} size="md">Retry</Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 md:py-8" data-testid="formioContainer">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Raise Job Requisition</h1>
          <p className="text-sm text-gray-500 mt-1">Fill in the details using dynamic Form.io renderer</p>
        </div>
        <button
          onClick={() => navigate("/webapp/recruitment/requisition")}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
        >
          <X size={20} />
        </button>
      </div>

      {validationErrors.length > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800 mb-1">Please fix the following errors:</p>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-0.5">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div ref={tabBarRef} className="flex overflow-x-auto border-b border-gray-200 scrollbar-hide">
          {steps.map((step, idx) => {
            const isActive = idx === currentTab;
            const isPast = idx < currentTab;
            return (
              <button
                key={step}
                type="button"
                data-active={isActive}
                onClick={() => handleTabClick(idx)}
                className={`relative px-4 md:px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                  isActive
                    ? "text-primary-500 border-b-2 border-primary-500"
                    : isPast
                    ? "text-gray-700 hover:text-primary-500"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-semibold ${
                      isActive ? "bg-primary-500 text-white" : isPast ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {isPast ? <Check size={12} /> : idx + 1}
                  </span>
                  {step}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-6 md:p-8">
          {isReviewStep ? (
            <RequisitionReviewStep
              formData={formData as any}
              onSubmit={handleSubmit}
              onBack={handlePrevious}
              submitPending={isBusy}
              isEditMode={false}
              validationErrors={validationErrors}
            />
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-6">
                {steps[currentTab]}
              </h2>
              {/position/i.test(steps[currentTab] || "") && hasPositionCounts && (
                <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        No of. Positions <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={positionCountValue("number_of_positions")}
                        onChange={(event) =>
                          handlePositionCountChange("number_of_positions", event.target.value)
                        }
                        onBlur={() => commitPositionCount("number_of_positions")}
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                    {Number(formData.number_of_positions) > 0 && (
                      <>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">New</label>
                          <input
                            type="number"
                            min={0}
                            max={formData.number_of_positions}
                            value={positionCountValue("number_of_new_positions")}
                            onChange={(event) =>
                              handlePositionCountChange("number_of_new_positions", event.target.value)
                            }
                            onBlur={() => commitPositionCount("number_of_new_positions")}
                            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">Replacement</label>
                          <input
                            type="number"
                            min={0}
                            max={formData.number_of_positions}
                            value={positionCountValue("number_of_replacement_positions")}
                            onChange={(event) =>
                              handlePositionCountChange("number_of_replacement_positions", event.target.value)
                            }
                            onBlur={() => commitPositionCount("number_of_replacement_positions")}
                            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              <div ref={formContainerRef}>
                <Form
                  form={schemas[currentTab]}
                  submission={formSubmission}
                  onChange={handleChange}
                  options={{ noAlerts: true }}
                  formReady={(instance: any) => {
                    formInstanceRef.current = instance;
                  }}
                />
                {/position/i.test(steps[currentTab] || "") && hasPositionCounts && (
                  <PositionColumnCopyButtons
                    containerRef={formContainerRef}
                    onCopyColumn={copyColumnToAllPositions}
                  />
                )}

                {/other details/i.test(steps[currentTab] || "") && hasQualifications && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Qualifications
                    </label>
                    <div className="overflow-x-auto border rounded-md">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-gray-700">
                          <tr>
                            {qualificationFields.map((field: any) => (
                              <th key={field.fieldname} className="text-left font-medium px-3 py-2 border-b">
                                {field.label}
                                {Boolean(field.is_mandatory) && (
                                  <span className="text-red-500 ml-0.5">*</span>
                                )}
                              </th>
                            ))}
                            <th className="px-3 py-2 border-b w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {((formData as any).custom_qualifications || []).length === 0 && (
                            <tr>
                              <td colSpan={qualificationFields.length + 1} className="text-center text-gray-400 px-3 py-4">
                                No qualifications added yet.
                              </td>
                            </tr>
                          )}
                          {((formData as any).custom_qualifications || []).map(
                            (qualification: any, index: number) => (
                              <tr key={index} className="border-b last:border-b-0 align-top">
                                {qualificationFields.map((field: any) => (
                                  <td key={field.fieldname} className="px-3 py-2">
                                    {field.fieldtype === "Select" ? (
                                      <select
                                        value={qualification?.[field.fieldname] || ""}
                                        onChange={(e) =>
                                          updateQualificationField(index, field.fieldname, e.target.value)
                                        }
                                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                      >
                                        <option value="">Select</option>
                                        {(field.options || "")
                                          .split("\n")
                                          .filter(Boolean)
                                          .map((option: string) => (
                                            <option key={option} value={option}>
                                              {option}
                                            </option>
                                          ))}
                                      </select>
                                    ) : (
                                      <input
                                        type="text"
                                        value={qualification?.[field.fieldname] || ""}
                                        onChange={(e) =>
                                          updateQualificationField(index, field.fieldname, e.target.value)
                                        }
                                        placeholder={`Enter ${(field.label || field.fieldname).toLowerCase()}`}
                                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                      />
                                    )}
                                  </td>
                                ))}
                                <td className="px-3 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeQualification(index)}
                                    title="Remove qualification"
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
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={addQualification}
                        className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 transition"
                      >
                        + Add Qualification
                      </button>
                    </div>
                  </div>
                )}

                {/other details/i.test(steps[currentTab] || "") && (
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
              </div>
            </>
          )}

          {!isReviewStep && (<div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            <Button variant="outline" onClick={handlePrevious} disabled={currentTab === 0} size="md">
              Previous
            </Button>
            {isLastStep ? (
              <Button size="md" onClick={handleSubmit} loading={isBusy} disabled={isBusy} className="px-6">
                Submit Requisition
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <Button variant="outline" size="md" onClick={handlePreviewJobDetails} className="px-4 md:px-6">
                  Preview
                </Button>
                <Button size="md" onClick={handleNext} className="px-6">
                  Next
                </Button>
              </div>
            )}
          </div>
          )}

        </div>
      </div>

      {jobDetailsPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setJobDetailsPreviewOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{jobDetailsPreview.title || "Job Description Preview"}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {formDataRef.current.designation_title || formDataRef.current.designation}
                  {formDataRef.current.department || formDataRef.current.department_title ? ` · ${formDataRef.current.department_title || formDataRef.current.department}` : ""}
                  {jobDetailsPreview.source ? ` · ${jobDetailsPreview.source}` : ""}
                </p>
              </div>
              <button onClick={() => setJobDetailsPreviewOpen(false)} className="p-2 rounded-md hover:bg-gray-100 text-gray-500 transition"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {jobDetailsPreview.loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="animate-spin text-primary-500" size={32} />
                  <span className="ml-3 text-gray-500 text-sm">Loading job description…</span>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: jobDetailsPreview.html }} />
              )}
            </div>
            <div className="flex justify-end px-6 py-4 border-t">
              <button onClick={() => setJobDetailsPreviewOpen(false)} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequisitionFormV2;
