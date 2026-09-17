/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NewHireField, NewHireSection, NewHireTab } from "../../../types/newHire";

export interface FormioComponent {
  type: string;
  key: string;
  label?: string;
  title?: string;
  placeholder?: string;
  input?: boolean;
  disabled?: boolean;
  customClass?: string;
  validate?: {
    required?: boolean;
    pattern?: string;
    customMessage?: string;
    maxLength?: number;
    custom?: string;
    min?: number;
    max?: number;
  };
  validateOn?: string;
  data?: any;
  dataSrc?: string;
  selectValues?: string;
  valueProperty?: string;
  template?: string;
  limit?: number;
  lazyLoad?: boolean;
  searchField?: string;
  format?: string;
  enableDate?: boolean;
  enableTime?: boolean;
  widget?: any;
  decimalLimit?: number;
  components?: FormioComponent[];
  defaultValue?: any;
  description?: string;
  tooltip?: string;
  columns?: { width: number; components: FormioComponent[] }[];
  refreshOn?: string | string[];
  clearOnRefresh?: boolean;
  clearOnHide?: boolean;
  customConditional?: string;
  logic?: any[];
}

export interface FormioSchema {
  display: string;
  components: FormioComponent[];
}

export const LINK_FIELD_DEPENDENCIES: Record<
  string,
  { filter: string; on: string; doctype?: string; customConditional?: string }
> = {
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

export const REQUISITION_SCOPE_FILTERED: Record<string, string> = {
  company: "",
  department: "&req_company={{ data.company }}",
  designation: "&req_company={{ data.company }}&req_department={{ data.department }}",
};

export const LINK_FIELDS_SHOWING_ID = new Set(["department", "designation"]);

export function translateDependsOn(expr: string): string {
  return expr
    .replace(/^eval:\s*/i, "")
    .replace(/(?:doc|data)\.([\w]+)/g, (_, key: string) => `data.${key}`);
}

export function evalDependsOn(
  expr: string | undefined,
  data: Record<string, any>
): boolean {
  if (!expr) return false;
  try {
    return !!new Function("data", `return !!(${translateDependsOn(expr)});`)(data || {});
  } catch {
    return false;
  }
}

export function buildSelectData(data: Record<string, any>): Record<string, any> {
  const sd: Record<string, any> = {};
  const opt = (id: any, label: any) => ({ id, value: id, label });

  Object.keys(data || {}).forEach((key) => {
    if (key.endsWith("_title")) return;
    const titleKey = `${key}_title`;
    const id = data[key];
    const label = data[titleKey];
    if (id && label) sd[key] = opt(id, label);
  });

  return sd;
}

/**
 * Build a single Form.io component from a Frappe NewHireField.
 */
export const buildFormField = (field: NewHireField): FormioComponent => {
  const isRequired = field.is_mandatory === 1;
  const isReadOnly = field.read_only === 1;

  const base: FormioComponent = {
    type: "textfield",
    key: field.fieldname,
    label: field.label,
    placeholder: `Enter ${field.label.toLowerCase()}`,
    input: true,
    defaultValue: field.default || "",
    disabled: isReadOnly,
    customClass: isRequired ? "required-field mb-3" : "mb-3",
    validate: {
      required: isRequired,
      customMessage: `${field.label} is required`,
    },
    validateOn: "blur",
    ...(field.description ? { description: field.description, tooltip: field.description } : {}),
  };

  if (field.depends_on) {
    base.customConditional = `show = (${translateDependsOn(field.depends_on)});`;
  }

  if (!isRequired && field.mandatory_depends_on) {
    const condition = translateDependsOn(field.mandatory_depends_on);
    const message = JSON.stringify(`${field.label || field.fieldname} is required.`);
    base.validate = {
      ...base.validate,
      custom:
        `valid = !(${condition}) || ` +
        `!(input === undefined || input === null || input === "" || ` +
        `(Array.isArray(input) && input.length === 0)) ? true : ${message};`,
    };
  }

  if (field.fieldname === "department") {
    base.logic = [
      {
        name: "Disable if no company",
        trigger: { type: "javascript", javascript: "result = !data.company;" },
        actions: [
          {
            name: "Disable",
            type: "property",
            property: { label: "Disabled", value: "disabled", type: "boolean" },
            state: true,
          },
        ],
      },
    ];
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
            state: true,
          },
        ],
      },
    ];
  }

  switch (field.fieldtype) {
    case "Select": {
      const values = field.options
        ? field.options
          .split(/[\n,]/)
          .map((o) => o.trim())
          .filter(Boolean)
          .map((o) => ({ label: o, value: o }))
        : [];
      return {
        ...base,
        type: "select",
        placeholder: `Select ${field.label.toLowerCase()}`,
        data: { values },
        template: "<span>{{ item.label }}</span>",
      };
    }

    case "Link": {
      const dependency = LINK_FIELD_DEPENDENCIES[field.fieldname];
      const linkDoctype =
        dependency?.doctype ||
        field.options ||
        (field.fieldname === "company"
          ? "Company"
          : field.fieldname === "department"
            ? "Department"
            : field.fieldname === "designation"
              ? "Designation"
              : "");
      const activeEmployeeFilter = linkDoctype === "Employee" ? "&status=Active" : "";
      const scopeFilter = REQUISITION_SCOPE_FILTERED[field.fieldname] || "";

      return {
        ...base,
        type: "select",
        placeholder: `Select ${field.label}`,
        dataSrc: "url",
        data: {
          url: `/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=${encodeURIComponent(
            linkDoctype
          )}${dependency?.filter || ""}${activeEmployeeFilter}${scopeFilter}`,
          headers: [{ key: "Accept", value: "application/json" }],
        },
        selectValues: "message.results",
        valueProperty: "id",
        template:
          LINK_FIELDS_SHOWING_ID.has(field.fieldname) || linkDoctype === "Employee"
            ? `<span>{{ item.label || data.${field.fieldname}_title || item.id || item }} <span style='color:#7f8c8d'>({{ item.id || item }})</span></span>`
            : `<span>{{ item.label || data.${field.fieldname}_title || item.id || item }}</span>`,
        limit: 20,
        lazyLoad: false,
        searchField: "search_text",
        ...(dependency
          ? {
            refreshOn: dependency.on,
            clearOnRefresh: true,
            clearOnHide: true,
            ...(dependency.customConditional ? { customConditional: dependency.customConditional } : {}),
          }
          : {}),
      };
    }

    case "Date": {
      return {
        ...base,
        type: "datetime",
        placeholder: `Select ${field.label.toLowerCase()}`,
        format: "yyyy-MM-dd",
        enableDate: true,
        enableTime: false,
        widget: {
          type: "calendar",
          displayInTimezone: "viewer",
          locale: "en",
          useLocaleSettings: false,
          allowInput: true,
          mode: "single",
          enableTime: false,
          noCalendar: false,
          format: "yyyy-MM-dd",
        },
      };
    }

    case "Datetime": {
      return {
        ...base,
        type: "datetime",
        placeholder: `Select ${field.label.toLowerCase()}`,
        format: "yyyy-MM-dd HH:mm:ss",
        enableDate: true,
        enableTime: true,
        widget: {
          type: "calendar",
          displayInTimezone: "viewer",
          locale: "en",
          useLocaleSettings: false,
          allowInput: true,
          mode: "single",
          enableTime: true,
          noCalendar: false,
          format: "yyyy-MM-dd HH:mm:ss",
        },
      };
    }

    case "Int":
    case "Float":
    case "Currency":
    case "Percent": {
      return {
        ...base,
        type: "number",
        placeholder: `Enter ${field.label.toLowerCase()}`,
        decimalLimit: field.fieldtype === "Int" ? 0 : 2,
      };
    }

    case "Check": {
      return {
        ...base,
        type: "checkbox",
      };
    }

    case "Small Text":
    case "Text":
    case "Long Text":
    case "Text Editor": {
      return {
        ...base,
        type: "textarea",
        placeholder: `Enter ${field.label.toLowerCase()}`,
      };
    }

    case "Data":
    default: {
      const isEmail =
        field.options === "Email" ||
        field.fieldname.toLowerCase().includes("email");

      if (isEmail) {
        return {
          ...base,
          type: "textfield",
          validate: {
            ...base.validate,
            pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
            customMessage: "Please enter a valid email address.",
          },
        };
      }

      const isPhone =
        field.options === "Phone" ||
        field.fieldname.toLowerCase().includes("mobile") ||
        field.fieldname.toLowerCase().includes("phone");

      if (isPhone) {
        return {
          ...base,
          type: "phoneNumber",
          placeholder: `Enter ${field.label.toLowerCase()}`,
        };
      }

      return base;
    }
  }
};

/**
 * Determines whether a field should span full width (e.g. textareas, tables).
 */
const isFullWidthField = (field: NewHireField): boolean => {
  return [
    "Small Text",
    "Text",
    "Long Text",
    "Text Editor",
    "Table",
    "Table MultiSelect",
    "HTML",
  ].includes(field.fieldtype);
};

/**
 * Layout fields into a responsive 2-column grid (width: 6 on md/lg, stacked on mobile).
 */
export const layoutFieldsInColumns = (
  fields: NewHireField[],
  sectionKey: string
): FormioComponent[] => {
  const components: FormioComponent[] = [];
  let currentPair: FormioComponent[] = [];

  const flushPair = (rowIndex: number) => {
    if (currentPair.length === 0) return;
    components.push({
      type: "columns",
      key: `${sectionKey}_row_${rowIndex}`,
      customClass: "mb-2",
      columns: [
        {
          width: 6,
          components: [currentPair[0]],
        },
        ...(currentPair.length > 1
          ? [
            {
              width: 6,
              components: [currentPair[1]],
            },
          ]
          : [
            {
              width: 6,
              components: [],
            },
          ]),
      ],
    });
    currentPair = [];
  };

  let rowIndex = 0;
  for (const field of fields) {
    const comp = buildFormField(field);
    if (isFullWidthField(field)) {
      flushPair(rowIndex++);
      components.push({
        type: "columns",
        key: `${sectionKey}_row_${rowIndex++}`,
        customClass: "mb-2",
        columns: [
          {
            width: 12,
            components: [comp],
          },
        ],
      });
    } else {
      currentPair.push(comp);
      if (currentPair.length === 2) {
        flushPair(rowIndex++);
      }
    }
  }

  flushPair(rowIndex);
  return components;
};

/**
 * Build Form.io section panel from a NewHireSection with responsive 2-column fields.
 */
export const buildSectionPanel = (
  section: NewHireSection,
  defaultTitle: string = "Details"
): FormioComponent => {
  const panelTitle = section.section || defaultTitle;
  const sectionKey = (section.section || defaultTitle)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_");

  return {
    type: "panel",
    title: section.section ? panelTitle : "",
    label: section.section ? panelTitle : "",
    key: `${sectionKey}_panel`,
    customClass: "py-4 px-5 bg-white border border-gray-200 rounded-xl mb-5 shadow-sm formio-section-panel",
    components: layoutFieldsInColumns(section.fields, sectionKey),
  };
};

/**
 * Build a Form.io schema for a single tab.
 */
export const compileTabSchema = (tab: NewHireTab): FormioSchema => {
  const components: FormioComponent[] = tab.sections.map((section) =>
    buildSectionPanel(section, tab.tab)
  );
  return {
    display: "form",
    components,
  };
};

/**
 * Build a complete unified Form.io schema with tabs layout.
 */
export const compileFullFormioSchema = (tabs: NewHireTab[]): FormioSchema => {
  const tabComponents: FormioComponent[] = tabs.map((t) => {
    const tabKey = t.tab.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_tab";
    return {
      type: "panel",
      key: tabKey,
      label: t.tab,
      title: t.tab,
      components: t.sections.map((section) => buildSectionPanel(section, t.tab)),
    };
  });

  return {
    display: "form",
    components: [
      {
        type: "tabs",
        key: "newHireFormTabs",
        components: tabComponents,
      },
    ],
  };
};

/**
 * Sanitizes form submission values before sending to Frappe backend:
 * - Coerces Date ISO strings (e.g. "2000-06-02T00:00:00+05:30") to "YYYY-MM-DD"
 * - Coerces Datetime to "YYYY-MM-DD HH:mm:ss"
 * - Replaces empty string values on Link and numeric fields with null
 */
export const sanitizeNewHirePayload = (
  rawPayload: Record<string, any>,
  tabs: NewHireTab[]
): Record<string, any> => {
  const fieldTypes: Record<string, string> = {};
  for (const tab of tabs) {
    for (const section of tab.sections) {
      for (const field of section.fields) {
        fieldTypes[field.fieldname] = field.fieldtype;
      }
    }
  }

  const cleanPayload: Record<string, any> = {};
  for (const [key, val] of Object.entries(rawPayload)) {
    if (val === undefined) continue;

    const fType = fieldTypes[key];
    if (fType === "Date") {
      if (!val) {
        cleanPayload[key] = null;
      } else if (typeof val === "string") {
        cleanPayload[key] = val.split("T")[0];
      } else {
        cleanPayload[key] = val;
      }
    } else if (fType === "Datetime") {
      if (!val) {
        cleanPayload[key] = null;
      } else if (typeof val === "string" && val.includes("T")) {
        try {
          const d = new Date(val);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          const hh = String(d.getHours()).padStart(2, "0");
          const min = String(d.getMinutes()).padStart(2, "0");
          const ss = String(d.getSeconds()).padStart(2, "0");
          cleanPayload[key] = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
        } catch {
          cleanPayload[key] = val;
        }
      } else {
        cleanPayload[key] = val;
      }
    } else if (val === "") {
      if (fType === "Link" || ["Int", "Float", "Currency", "Percent"].includes(fType)) {
        cleanPayload[key] = null;
      } else {
        cleanPayload[key] = val;
      }
    } else {
      cleanPayload[key] = val;
    }
  }

  return cleanPayload;
};
