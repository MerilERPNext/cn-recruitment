/* eslint-disable @typescript-eslint/no-explicit-any */
import { format, parseISO, isValid } from "date-fns";
import { profileService } from "../../services/profileService";

// Cache for table field metadata to prevent duplicate API calls
const tableFieldsCache = new Map<string, any[]>();

export const READ_ONLY_FIELDS = [
  "custom_cxo",
  "custom_designation_name",
  "custom_dotted_line_manager",
  "custom_hrbp",
  "custom_hod",
  "reports_to",
  "company",
  "department",
  "designation",
  "custom_functional_area",
];

/**
 * Fetches table field metadata with caching
 * @param doctype - The doctype of the table to fetch fields for
 * @returns Array of field definitions
 */
async function getTableFields(doctype: string): Promise<any[]> {
  if (tableFieldsCache.has(doctype)) {
    return tableFieldsCache.get(doctype)!;
  }

  try {
    const res = await profileService.getEmployeeFieldPermissions({
      doctype,
      detailed: 1,
      all_fields: 1,
    });

    if (res?.length) {
      tableFieldsCache.set(doctype, res);
      return res;
    }
  } catch (e) {
    console.error(`Failed to fetch fields for table ${doctype}`, e);
  }

  return [];
}

/**
 * Clears the table fields cache
 */
export function clearTableFieldsCache() {
  tableFieldsCache.clear();
}

/**
 * Pre-fetches all table field metadata for the given fields
 * @param apiFields - Array of field definitions
 */
async function prefetchTableFields(apiFields: any[]): Promise<void> {
  const tableFields = apiFields.filter(
    (f) => f.fieldtype === "Table" || f.fieldtype === "Table Multiselect" || f.fieldtype === "Table MultiSelect" && f.options
  );
  const uniqueDoctypes = [...new Set(tableFields.map((f) => f.options))];

  await Promise.all(uniqueDoctypes.map((doctype) => getTableFields(doctype)));
}

// Enhanced mapping for better FormIO compatibility
const formioFieldTypeMap: Record<string, string> = {
  // Text fields
  Data: "textfield",
  Text: "textfield",
  "Small Text": "textarea",
  "Long Text": "textarea",
  "Text Editor": "textarea",
  Textarea: "textarea",
  "Read Only": "textfield",

  // Number fields
  Int: "number",
  Float: "number",
  Currency: "currency",
  Percent: "number",

  // Date/Time fields
  Date: "datetime",
  Datetime: "datetime",
  Time: "time",

  // Selection fields
  Select: "select",
  Link: "select",
  "Dynamic Link": "select",

  // Boolean fields
  Check: "checkbox",

  // Special input types
  Password: "password",
  Email: "email",
  Phone: "phoneNumber",
  URL: "url",

  // File/Media fields
  Attach: "file",
  "Attach Image": "file",
  Signature: "signature",

  // Complex fields
  Table: "datagrid",
  "Table MultiSelect": "select",
  "Table Multiselect": "select",

  // HTML field
  HTML: "content",

  // Rating field
  Rating: "number",
};


function mapFieldToFormio(field: any, fieldValue: any): any {
  const type = formioFieldTypeMap[field.fieldtype] || "textfield";

  let schema: any = {
    label: field.label || field.fieldname,
    key: field.fieldname,
    type,
    input: type !== "content", // content type doesn't accept input
    tableView: true,
    validate: {},
    defaultValue: fieldValue ?? undefined,
  };

  // Special processing for Table MultiSelect values
  if (
    (field.fieldtype === "Table MultiSelect" ||
      field.fieldtype === "Table Multiselect") &&
    Array.isArray(fieldValue)
  ) {
    schema.defaultValue = fieldValue.map((row: any) => {
      // For Table MultiSelect, the value is typically in a Link field in the child table.
      // We try to find that link field to know how to extract/re-wrap it.
      const linkField = field.child_fields?.find((cf: any) => cf.fieldtype === 'Link');
      const linkFieldName = linkField?.fieldname;

      if (linkFieldName && row[linkFieldName]) return row[linkFieldName];

      // fallback
      return (
        row[field.fieldname] ||
        row[field.label] ||
        row.label ||
        row.name ||
        Object.keys(row).find(k => !['name', 'owner', 'parent', 'parentfield', 'parenttype', 'idx', 'docstatus', 'creation', 'modified', 'modified_by'].includes(k) && typeof row[k] === 'string')
      );
    });
  }

  // Handle validation
  if (field.reqd) {
    schema.validate.required = true;
  }

  // Handle field length constraints
  if (field.length && (type === "textfield" || type === "textarea")) {
    schema.validate.maxLength = parseInt(field.length);
  }

  // Handle precision for numbers
  if (
    (field.fieldtype === "Float" || field.fieldtype === "Currency") &&
    field.precision
  ) {
    schema.decimalLimit = parseInt(field.precision);
  }

  // Handle different field types with specific configurations
  switch (field.fieldtype) {
    case "Select":
      schema.widget = "choicesjs";
      schema.dropdown = "body";
      if (field.options) {
        schema.data = {
          values: field.options
            .split("\n")
            .filter(Boolean)
            .map((opt: string) => ({ label: opt.trim(), value: opt.trim() })),
        };
      }
      break;

    case "Table MultiSelect": {
      schema.type = "select";
      schema.widget = "choicesjs";
      schema.dropdown = "body";
      schema.dataSrc = "url";
      schema.searchEnabled = true;
      schema.multiple = true
      const linkField = field.child_fields?.find((cf: any) => cf.fieldtype === 'Link');
      schema.data = {
        url: `/api/method/cn_hrms_core.cn_hrms_core.apis.fetch_data.get_searched_doc_list?fields=["*"]&doctype=${field.link_options || field.options || ""}&limit=20`,
      };
      schema.isTableMultiSelect = true;
      schema.linkFieldName = linkField?.fieldname || "";

      schema.lazyLoad = true;
      schema.dataType = "string";
      schema.idPath = "name";
      schema.valueProperty = "name";
      schema.selectValues = "message";
      schema.searchField = "q";
      schema.template = (item: any) => {
        const data = item?.item || {};

        const name = data.name || "";

        const secondary =
          data.employee_name ||
          data.title ||
          data.label ||
          data.full_name ||
          data.fullname ||
          data.first_name ||
          "";

        const designation = data.custom_designation_name || "";
        const branch = data.branch || "";

        const infoText =
          designation && branch
            ? `${designation} | ${branch}`
            : designation || branch;

        return `
            <div class="formio-select-item">
              <div class="formio-select-item-main">
                <span class="primary">${name}</span>
                ${secondary ? `<span class="secondary">(${secondary})</span>` : ""}
              </div>
  
              ${infoText
            ? `
                <div class="formio-select-item-info">
                  <span>${infoText}</span>
                </div>
              `
            : ""}
  
            </div>
          `;
      };
      break;
    }
    case "Link": {
      schema.type = "select";
      schema.widget = "choicesjs";
      schema.dropdown = "body";
      schema.dataSrc = "url";
      schema.searchEnabled = true;
      schema.multiple = false;

      schema.data = {
        url: `/api/method/cn_hrms_core.cn_hrms_core.apis.fetch_data.get_searched_doc_list?fields=["*"]&doctype=${field.link_options || field.options || ""}&limit=20`,
      };

      schema.lazyLoad = true;
      schema.dataType = "string";
      schema.idPath = "name";
      schema.valueProperty = "name";
      schema.selectValues = "message";
      schema.searchField = "q";
      schema.template = (item: any) => {
        const data = item?.item || {};

        const name = data.name || "";
        const label = data?.reference_name || ""
        // const secondary =
        //   data.employee_name ||
        //   data.title ||
        //   data.label ||
        //   data.full_name ||
        //   data.fullname ||
        //   data.first_name ||
        //   "";

        const designation = data.custom_designation_name || "";
        const branch = data.branch || "";

        const infoText =
          designation && branch
            ? `${designation} | ${branch}`
            : designation || branch;

        return `
          <div class="formio-select-item">
            <div class="formio-select-item-main">
              <span class="primary">${label}</span>
              ${name ? `<span class="secondary">(${name})</span>` : ""}
            </div>

            ${infoText
            ? `
              <div class="formio-select-item-info">
                <span>${infoText}</span>
              </div>
            `
            : ""}

          </div>
        `;
      };
      break;
    }

    case "Dynamic Link":
      schema.type = "select";
      schema.widget = "choicesjs";
      schema.dropdown = "body";
      schema.data = { values: [] };
      schema.searchEnabled = true;
      break;

    case "Check":
      schema.defaultValue = Boolean(field.value);
      schema.inputType = "checkbox";
      break;

    case "Date":
      schema.widget = {
        type: "calendar",
        displayInTimezone: "viewer",
        timezone: "default",
        format: "dd-MM-yyyy",
        useLocaleSettings: false,
        allowInput: true,
        clickOpens: true,
        enableTime: false,
        mode: "single",
      };
      schema.format = "dd-MM-yyyy";
      schema.placeholder = "Enter date";
      break;

    case "Datetime":
      schema.widget = {
        type: "calendar",
        displayInTimezone: "viewer",
        timezone: "default",
        format: "dd-MM-yyyy HH:mm:ss",
        useLocaleSettings: false,
        allowInput: true,
        clickOpens: true,
        enableTime: true,
        mode: "single",
      };
      schema.format = "dd-MM-yyyy HH:mm:ss";
      schema.placeholder = "Enter date and time";
      break;

    case "Time":
      schema.format = "HH:mm:ss";
      schema.inputMask = "99:99:99";
      break;

    case "Currency":
      schema.currency = "USD"; // Default currency, should be configurable
      schema.decimalLimit = field.precision || 2;
      schema.delimiter = true;
      break;

    case "Percent":
      schema.suffix = "%";
      schema.decimalLimit = 2;
      break;

    case "Int":
      schema.decimalLimit = 0;
      break;

    case "Float":
      schema.decimalLimit = field.precision || 2;
      break;

    case "Email":
      schema.validate.pattern =
        "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$";
      schema.kickbox = { enabled: false };
      break;

    case "Phone":
      schema.inputMask = "(999) 999-9999";
      break;

    case "URL":
      schema.validate.pattern = "^(https?|ftp)://[^\\s/$.?#].[^\\s]*$";
      break;

    case "Password":
      schema.protected = true;
      break;

    case "Text Editor":
    case "Long Text":
      schema.wysiwyg = field.fieldtype === "Text Editor";
      schema.rows = 4;
      break;

    case "Small Text":
      schema.placeholder = schema.placeholder || "Enter text";
      schema.input = true;
      schema.type = "textfield";
      break;

    case "Textarea":
      schema.rows = 3;
      break;

    case "Table":
      schema.type = "datagrid";
      schema.components = []; // Should be populated with child table fields
      schema.addAnotherPosition = "bottom";
      schema.layoutFixed = false;
      schema.enableRowGroups = false;
      schema.initEmpty = false;
      break;

    case "Attach":
    case "Attach Image":
      schema = {
        ...schema,
        storage: "customBase64",
        fileTypes:
          field.fieldtype === "Attach Image"
            ? [{ label: "Images", value: "image/*" }]
            : [],
        multiple: false,
      };

      if (Array.isArray(fieldValue) && fieldValue.length > 0) {
        // Handle Formio file array (after submit, before reload)
        const file = fieldValue[0];
        const url = file.url || file.data?.file_url || null;
        schema.defaultValue = url
          ? [
            {
              storage: "url",
              url,
              name: url.split("/").pop(),
              originalName: url.split("/").pop(),
              size: file.size || 0,
              type: file.type || "file",
            },
          ]
          : "";
      } else if (typeof fieldValue === "string" && fieldValue.trim() !== "") {
        // Handle backend string (after reload)
        schema.defaultValue = [
          {
            storage: "url",
            url: fieldValue,
            name: fieldValue.split("/").pop(),
            originalName: fieldValue.split("/").pop(),
            size: 0,
            type: "file",
          },
        ];
      } else {
        schema.defaultValue = [];
      }
      break;
    case "Signature":
      schema.width = "400";
      schema.height = "150";
      schema.penColor = "black";
      schema.backgroundColor = "rgb(245,245,235)";
      break;

    case "HTML":
      schema.type = "content";
      schema.html = field.options || "";
      schema.refreshOnChange = false;
      break;

    case "Read Only":
      schema.disabled = true;
      schema.tableView = false;
      break;
  }

  // Handle field descriptions/help text
  if (field.description) {
    schema.tooltip = field.description;
  }

  // Handle hidden fields
  if (field.hidden) {
    schema.hidden = true;
    schema.tableView = false;
  }

  // Handle read-only fields
  if (
    field.read_only === 1 ||
    field.read_only === true ||
    READ_ONLY_FIELDS.includes(field.fieldname)
  ) {
    // Don't disable Table or Table MultiSelect fields - they need to load their data/options
    if (
      field.fieldtype !== "Table" &&
      field.fieldtype !== "Table MultiSelect" &&
      field.fieldtype !== "Table Multiselect"
    ) {
      schema.disabled = true;
    }
  }

  // Handle custom CSS classes
  if (field.fieldtype === "Column Break") {
    schema.customClass = "formio-layout-break";
  }

  // Set placeholder if not set and field has one
  if (!schema.placeholder && field.placeholder) {
    schema.placeholder = field.placeholder;
  }

  // Final safety check for multiple selects
  if (schema.multiple && (schema.defaultValue === undefined || schema.defaultValue === null || schema.defaultValue === "")) {
    schema.defaultValue = [];
  }

  return schema;
}

/**
 * Formats a raw backend value into a Form.io compatible structure based on component type.
 */
export function formatValueForFormio(value: any, component: any, displayValue?: any): any {
  if (value === null || value === undefined) {
    return component?.multiple || component?.type === 'file' || component?.type === 'datagrid' ? [] : "";
  }

  // Handle File fields
  if (component?.type === 'file' || component?.storage === 'customBase64' || component?.storage === 'url') {
    if (typeof value === 'string' && value.trim() !== '') {
      return [
        {
          storage: "url",
          url: value,
          name: value.split("/").pop(),
          originalName: value.split("/").pop(),
          size: 0,
          type: "file",
        },
      ];
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return [];
      // If it's already in Form.io format, keep it
      if (value[0] && typeof value[0] === 'object' && value[0].url) return value;
      // If it's an array of strings (URLs)?
      return value.map(v => typeof v === 'string' ? {
        storage: "url",
        url: v,
        name: v.split("/").pop(),
        originalName: v.split("/").pop(),
        size: 0,
        type: "file",
      } : v).filter(v => v.url);
    }
    return [];
  }

  // Handle Tables (DataGrid)
  if (component?.type === 'datagrid') {
    if (Array.isArray(value)) {
      return value.map(row => {
        const newRow = { ...row };
        if (component.components) {
          component.components.forEach((childComp: any) => {
            const childValue = newRow[childComp.key];
            const childDisplayValue = newRow[`${childComp.key}_display`];
            newRow[childComp.key] = formatValueForFormio(childValue, childComp, childDisplayValue);
          });
        }
        return newRow;
      });
    }
    return [{}];
  }

  // Handle Multiple Select (including Table MultiSelect)
  if (component?.multiple) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') return [value];
    return [];
  }

  // Combine value and displayValue if they differ and it's not a complex type
  if (displayValue !== undefined && displayValue !== null && displayValue !== "" && displayValue !== value) {
    return `${displayValue} (${value})`;
  }

  return value;
}

export interface TabWithSchema {
  components?: any;
  key: string;
  label: string;
  schema: any;
}

export interface FormioWithTabs {
  tabs: TabWithSchema[];
  hasTabs: boolean;
}

export async function convertToFormioWithTabMetadata(
  apiFields: any[],
  employeeData: any
): Promise<FormioWithTabs> {
  if (!apiFields || !Array.isArray(apiFields)) {
    console.warn(
      "Invalid apiFields provided to convertToFormioWithTabMetadata:",
      apiFields
    );
    return { tabs: [], hasTabs: false };
  }

  // Pre-fetch all table field metadata to avoid duplicate API calls
  await prefetchTableFields(apiFields);

  const tabs: TabWithSchema[] = [];
  let currentTab: any = null;
  let currentSection: any = null;
  // Columns support removed to force full width
  // let currentColumns: any = null;
  // let currentColumnIndex = 0;

  // Helper function to close current structures
  const closeCurrentStructures = () => {
    // If there are buffered fields, add them directly to the section
    if (fieldsBuffer.length > 0 && currentSection) {
      currentSection.components.push(...fieldsBuffer);
      fieldsBuffer = [];
    }

    // Logic for columns removed

    if (currentSection && currentTab) {
      currentTab.components.push(currentSection);
      currentSection = null;
    }
  };

  // Helper to ensure we have a tab — orphan fields land in basic_details_tab so
  // they are merged when the real Tab Break for basic_details_tab arrives.
  const ensureCurrentTab = () => {
    if (!currentTab) {
      currentTab = {
        label: "Basic Details",
        key: "basic_details_tab",
        components: [],
      };
    }
  };

  let lastFieldType = "";
  let fieldsBuffer: any[] = [];

  for (const field of apiFields) {
    if (!field || !field.fieldtype || field?.label === "Connections") continue;
    if (field.hidden === true) continue;

    if (lastFieldType.endsWith(" Break") && field.fieldtype === lastFieldType) {
      continue;
    }
    lastFieldType = field.fieldtype;

    if (field.fieldtype === "Button" || field.hidden === 1) continue;

    if (field.fieldtype === "Tab Break") {
      if (fieldsBuffer.length > 0 && currentSection) {
        currentSection.components.push(...fieldsBuffer);
        fieldsBuffer = [];
      }

      closeCurrentStructures();
      if (currentTab) {
        tabs.push(currentTab);
      }

      const tabKey = field.fieldname || `tab_${tabs.length + 1}`;
      // If an orphan basic_details_tab was already pushed, reclaim it to avoid duplicates
      const orphanIdx = tabs.findIndex((t) => t.key === tabKey);
      if (orphanIdx !== -1) {
        currentTab = tabs.splice(orphanIdx, 1)[0];
        currentTab.label = field.label || currentTab.label;
      } else {
        currentTab = {
          label: field.label || `Tab ${tabs.length + 1}`,
          key: tabKey,
          components: [],
        };
      }
      fieldsBuffer = [];
    } else if (field.fieldtype === "Section Break") {
      if (fieldsBuffer.length > 0 && currentSection) {
        currentSection.components.push(...fieldsBuffer);
        fieldsBuffer = [];
      }

      // Column logic removed, just push current section

      if (currentSection && currentTab) {
        currentTab.components.push(currentSection);
      }

      ensureCurrentTab();

      const panelKey =
        field.fieldname ||
        `section_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

      if (field.collapsible) {
        currentSection = {
          type: "panel",
          title: field.label
            ? `<span style="font-weight:600; font-size:1.05rem; line-height:1.2;">${field.label}</span>`
            : "",
          key: panelKey,
          components: [],
          input: false,
          tableView: false,
          collapsible: true,
          collapsed: !!field.collapsed,
          customClass: "formio-section-panel",
        };

        if (field.description) {
          currentSection.components.push({
            type: "htmlelement",
            key: `desc_${panelKey}`,
            content: `<div style="color:#555; font-size:0.9rem; margin-bottom:12px;">${field.description}</div>`,
            input: false,
            tableView: false,
          });
        }
      } else {
        currentSection = {
          type: "panel",
          title: "",
          key: panelKey,
          components: [],
          input: false,
          tableView: false,
          collapsible: false,
          collapsed: false,
          customClass: "",
        };

        if (field.label) {
          currentSection.components.push({
            type: "htmlelement",
            key: `header_${panelKey}`,
            label: field.label,
            content: `<h4 style="font-weight:600; font-size:1.05rem; margin:8px 0 12px;"></h4>`,
            input: false,
            tableView: false,
          });
        }

        if (field.description) {
          currentSection.components.push({
            type: "htmlelement",
            key: `desc_${panelKey}`,
            content: `<div style="color:#555; font-size:0.9rem; margin-bottom:12px;">${field.description}</div>`,
            input: false,
            tableView: false,
          });
        }
      }

      // currentColumns = null;
      fieldsBuffer = [];
    } else if (field.fieldtype === "Column Break") {
      // Column Break ignored to enforce full width
      ensureCurrentTab();

      // If we are in a section, just ensure we flush the buffer?
      // Actually, standard behavior is full width so we do nothing special here
      // just treat it as a continuation


    } else {
      const value = employeeData[field?.fieldname];
      const displayValue = employeeData[`${field?.fieldname}_display`];
      const fieldValue = (displayValue !== undefined && displayValue !== null && displayValue !== "" && displayValue !== value)
        ? `${displayValue} (${value})`
        : (value || "");
      let mapped: any = null;

      if (field.fieldtype === "Table") {
        const allowedFields = new Set([
          "Data",
          "Small Text",
          "Text",
          "Long Text",
          "Select",
          "Link",
          "Dynamic Link",
          "Currency",
          "Float",
          "Int",
          "Check",
          "Email",
          "Password",
          "Phone",
          "Percent",
          "Date",
          "Datetime",
          "Time",
          "Attach",
          "Attach Image",
          "Read Only",
        ]);

        let childComponents: any[] = [];
        if (field.options) {
          const res = await getTableFields(field.options);

          if (res?.length) {
            childComponents = res
              .filter((fd: any) => allowedFields.has(fd.fieldtype))
              .map((childField: any) => {
                const component = mapFieldToFormio(childField, undefined);
                component.applyMaskOn = "change";
                if (childField.fieldtype !== "Read Only") {
                  component.disabled = false;
                }
                return component;
              });
          }
        }

        const baseSchema = mapFieldToFormio(field, []); // Get base schema without value first

        mapped = {
          ...baseSchema,
          disabled: false, // Ensure table itself is not disabled
          icon: "table",
          type: "datagrid", // Ensure type is datagrid
          reorder: false,
          addAnotherPosition: "bottom",
          layoutFixed: false,
          enableRowGroups: false,
          initEmpty: false,
          tableView: false,
          defaultValue: [{}],
          components: childComponents,
        };

        // Handle value if present
        const val = employeeData[field.fieldname];
        if (Array.isArray(val)) {
          // Check for file fields that need transformation
          const fileKeys = childComponents
            .filter((c: any) => c.type === "file")
            .map((c: any) => c.key);

          if (fileKeys.length > 0) {
            mapped.defaultValue = val.map((row: any) => {
              const newRow = { ...row };
              fileKeys.forEach((key: string) => {
                const innerVal = newRow[key];
                if (typeof innerVal === "string" && innerVal.trim() !== "") {
                  // Transform string URL to FormIO file object
                  newRow[key] = [
                    {
                      storage: "url",
                      url: innerVal,
                      name: innerVal.split("/").pop(),
                      originalName: innerVal.split("/").pop(),
                      size: 0,
                      type: "file",
                    },
                  ];
                }
              });
              return newRow;
            });
          } else {
            mapped.defaultValue = val;
          }
        }
      } else {
        mapped = mapFieldToFormio(field, fieldValue);
      }

      if (!mapped) continue;

      ensureCurrentTab();

      if (currentSection) {
        currentSection.components.push(mapped);
      } else {
        currentTab.components.push(mapped);
      }
    }
  }

  // Flush remaining structures
  closeCurrentStructures();
  if (currentTab) {
    tabs.push(currentTab);
  }

  // Helper: detect if a tab or section actually contains inputs
  const hasInputs = (components: any[]): boolean => {
    if (!Array.isArray(components)) return false;
    return components.some((comp) => {
      if (!comp) return false;
      if (comp.input) return true;
      if (comp.components && Array.isArray(comp.components) && hasInputs(comp.components)) return true;
      if (comp.columns && Array.isArray(comp.columns)) {
        return comp.columns.some(
          (col: any) =>
            col && col.components && Array.isArray(col.components) && hasInputs(col.components)
        );
      }
      return false;
    });
  };

  // Remove empty sections (panels without inputs)
  tabs.forEach((tab) => {
    tab.components = tab.components.filter(
      (comp: any) =>
        comp.type !== "panel" || (comp.components && hasInputs(comp.components))
    );
  });

  // Remove empty tabs (those without any inputs)
  const filteredTabs = tabs.filter((tab) => hasInputs(tab.components));

  // If no tabs were created, fall back to Basic Details
  if (filteredTabs.length === 0) {
    filteredTabs.push({
      label: "Basic Details",
      key: "basic_details_tab",
      components: [],
      schema: undefined
    });
  }

  // Convert each tab to have its own schema
  const tabsWithSchemas: TabWithSchema[] = filteredTabs.map((tab) => ({
    key: tab.key,
    label: tab.label,
    schema: {
      type: "form",
      display: "form",
      components: tab.components,
    },
  }));

  return {
    tabs: tabsWithSchemas,
    hasTabs: filteredTabs.length > 1,
  };
}

// This function returns the whole schema at once basically we let formio manage the tabs
export async function convertToFormioWithLayout(
  apiFields: any[],
  employeeData: any
): Promise<any> {
  if (!apiFields || !Array.isArray(apiFields)) {
    console.warn(
      "Invalid apiFields provided to convertToFormioWithLayout:",
      apiFields
    );
    return { components: [] };
  }

  // Pre-fetch all table field metadata to avoid duplicate API calls
  await prefetchTableFields(apiFields);

  const tabs: any[] = [];
  let currentTab: any = null;
  let currentSection: any = null;
  let currentColumns: any = null;
  let currentColumnIndex = 0;

  // Helper function to close current structures
  const closeCurrentStructures = () => {

    if (fieldsBuffer.length > 0 && currentSection && !currentColumns) {
      currentSection.components.push(...fieldsBuffer);
      fieldsBuffer = [];
    }

    if (currentColumns && currentSection) {
      // Calculate equal width for all columns based on total count
      const totalColumns = currentColumns.columns.length;
      const columnWidth = Math.floor(12 / totalColumns);

      // Update all column widths to be equal
      currentColumns.columns.forEach((col: any, index: number) => {
        col.width = columnWidth;
        // If there's a remainder, distribute it to the last column
        if (index === totalColumns - 1) {
          col.width = 12 - columnWidth * (totalColumns - 1);
        }
      });

      currentSection.components.push(currentColumns);
      currentColumns = null;
    }
    if (currentSection && currentTab) {
      currentTab.components.push(currentSection);
      currentSection = null;
    }
  };

  // Helper to ensure we have a tab
  const ensureCurrentTab = () => {
    if (!currentTab) {
      currentTab = {
        label: "Basic Details",
        key: "basic_details_tab",
        components: [],
      };
    }
  };

  let lastFieldType = "";
  let fieldsBuffer: any[] = [];

  for (const field of apiFields) {
    if (!field || !field.fieldtype || field?.label === "Connections") continue;
    if (field.hidden === true) continue;

    if (lastFieldType.endsWith(" Break") && field.fieldtype === lastFieldType) {
      continue;
    }
    lastFieldType = field.fieldtype;

    if (field.fieldtype === "Button" || field.hidden === 1) continue;

    if (field.fieldtype === "Tab Break") {
      if (fieldsBuffer.length > 0 && currentSection && !currentColumns) {
        currentSection.components.push(...fieldsBuffer);
        fieldsBuffer = [];
      }

      closeCurrentStructures();
      if (currentTab) {
        tabs.push(currentTab);
      }

      const tabKey = field.fieldname || `tab_${tabs.length + 1}`;
      // Reclaim orphan basic_details_tab if already pushed, to avoid duplicates
      const orphanIdx = tabs.findIndex((t) => t.key === tabKey);
      if (orphanIdx !== -1) {
        currentTab = tabs.splice(orphanIdx, 1)[0];
        currentTab.label = field.label || currentTab.label;
      } else {
        currentTab = {
          label: field.label || `Tab ${tabs.length + 1}`,
          key: tabKey,
          components: [],
          input: false,
          tableView: false,
        };
      }
      fieldsBuffer = [];
    } else if (field.fieldtype === "Section Break") {
      if (fieldsBuffer.length > 0 && currentSection && !currentColumns) {
        currentSection.components.push(...fieldsBuffer);
        fieldsBuffer = [];
      }

      if (currentColumns && currentSection) {
        currentSection.components.push(currentColumns);
        currentColumns = null;
      }
      if (currentSection && currentTab) {
        currentTab.components.push(currentSection);
      }

      ensureCurrentTab();

      const panelKey =
        field.fieldname ||
        `section_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

      if (field.collapsible) {
        currentSection = {
          type: "panel",
          title: field.label
            ? `<span style="font-weight:600; font-size:1.05rem; line-height:1.2;">${field.label}</span>`
            : "",
          key: panelKey,
          components: [],
          input: false,
          tableView: false,
          collapsible: true,
          collapsed: !!field.collapsed,
          customClass: "formio-section-panel",
        };

        if (field.description) {
          currentSection.components.push({
            type: "htmlelement",
            key: `desc_${panelKey}`,
            content: `<div style="color:#555; font-size:0.9rem; margin-bottom:12px;">${field.description}</div>`,
            input: false,
            tableView: false,
          });
        }
      } else {
        currentSection = {
          type: "panel",
          title: "",
          key: panelKey,
          components: [],
          input: false,
          tableView: false,
          collapsible: false,
          collapsed: false,
          customClass: "",
        };

        if (field.label) {
          currentSection.components.push({
            type: "htmlelement",
            key: `header_${panelKey}`,
            label: field.label,
            content: `<h4 style="font-weight:600; font-size:1.05rem; margin:8px 0 12px;"></h4>`,
            input: false,
            tableView: false,
          });
        }

        if (field.description) {
          currentSection.components.push({
            type: "htmlelement",
            key: `desc_${panelKey}`,
            content: `<div style="color:#555; font-size:0.9rem; margin-bottom:12px;">${field.description}</div>`,
            input: false,
            tableView: false,
          });
        }
      }

      currentColumns = null;
      fieldsBuffer = [];
    } else if (field.fieldtype === "Column Break") {
      ensureCurrentTab();

      if (!currentSection) {
        currentSection = {
          type: "panel",
          title: "",
          key: `auto_section_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 11)}`,
          components: [],
          input: false,
          tableView: false,
        };
      }

      if (!currentColumns) {
        currentColumns = {
          type: "columns",
          key: `columns_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 11)}`,
          columns: [],
          input: false,
          tableView: false,
        };

        const firstColumn = {
          components: [...fieldsBuffer],
          width: 6,
          offset: 0,
          push: 0,
          pull: 0,
          size: "md",
        };
        currentColumns.columns.push(firstColumn);
        fieldsBuffer = [];
      }

      currentColumns.columns.push({
        components: [],
        width: 6,
        offset: 0,
        push: 0,
        pull: 0,
        size: "md",
      });
      currentColumnIndex = currentColumns.columns.length - 1;
    } else {
      const fieldValue = employeeData[field?.fieldname] || "";
      let mapped: any = null;

      if (field.fieldtype === "Table") {
        const allowedFields = new Set([
          "Data",
          "Small Text",
          "Text",
          "Long Text",
          "Select",
          "Link",
          "Dynamic Link",
          "Currency",
          "Float",
          "Int",
          "Check",
          "Email",
          "Password",
          "Phone",
          "Percent",
          "Date",
          "Datetime",
          "Time",
          "Attach",
          "Attach Image",
          "Read Only",
        ]);

        let childComponents: any[] = [];
        if (field.options) {
          const res = await getTableFields(field.options);

          if (res?.length) {
            childComponents = res
              .filter((fd: any) => allowedFields.has(fd.fieldtype))
              .map((childField: any) => {
                const component = mapFieldToFormio(childField, undefined);
                component.applyMaskOn = "change";
                if (childField.fieldtype !== "Read Only") {
                  component.disabled = false;
                }
                return component;
              });
          }
        }

        const baseSchema = mapFieldToFormio(field, []);

        mapped = {
          ...baseSchema,
          disabled: false,
          icon: "table",
          type: "datagrid",
          reorder: false,
          addAnotherPosition: "bottom",
          layoutFixed: false,
          enableRowGroups: false,
          initEmpty: false,
          tableView: false,
          defaultValue: [{}],
          components: childComponents,
        };

        if (Array.isArray(fieldValue)) {
          const fileKeys = childComponents
            .filter((c: any) => c.type === "file")
            .map((c: any) => c.key);

          if (fileKeys.length > 0) {
            mapped.defaultValue = fieldValue.map((row: any) => {
              const newRow = { ...row };
              fileKeys.forEach((key: string) => {
                const val = newRow[key];
                if (typeof val === "string" && val.trim() !== "") {
                  newRow[key] = [
                    {
                      storage: "url",
                      url: val,
                      name: val.split("/").pop(),
                      originalName: val.split("/").pop(),
                      size: 0,
                      type: "file",
                    },
                  ];
                } else if (!val || val === "") {
                  newRow[key] = [];
                }
              });
              return newRow;
            });
          } else {
            mapped.defaultValue = fieldValue;
          }
        }
      } else {
        mapped = mapFieldToFormio(field, fieldValue);
      }
      if (!mapped) continue;

      ensureCurrentTab();

      if (currentColumns && currentColumns.columns.length > 0) {
        currentColumns.columns[currentColumnIndex].components.push(mapped);
      } else if (currentSection) {
        fieldsBuffer.push(mapped);
      } else {
        currentTab.components.push(mapped);
      }
    }
  }

  // Flush remaining structures
  closeCurrentStructures();
  if (currentTab) {
    tabs.push(currentTab);
  }

  // Helper: detect if a tab or section actually contains inputs
  const hasInputs = (components: any[]): boolean => {
    if (!Array.isArray(components)) return false;
    return components.some((comp) => {
      if (!comp) return false;
      if (comp.input) return true;
      if (Array.isArray(comp.components) && hasInputs(comp.components)) return true;
      if (Array.isArray(comp.columns)) {
        return comp.columns.some(
          (col: any) =>
            col && Array.isArray(col.components) && hasInputs(col.components)
        );
      }
      return false;
    });
  };

  // Remove empty sections (panels without inputs)
  tabs.forEach((tab) => {
    tab.components = tab.components.filter(
      (comp: any) =>
        comp.type !== "panel" || (comp.components && hasInputs(comp.components))
    );
  });

  // Remove empty tabs (those without any inputs)
  const filteredTabs = tabs.filter((tab) => hasInputs(tab.components));

  // If no tabs were created, fall back to Basic Details
  if (filteredTabs.length === 0) {
    filteredTabs.push({
      label: "Basic Details",
      key: "basic_details_tab",
      components: [],
      input: false,
      tableView: false,
    });
  }

  // Final schema
  const schema = {
    type: "form",
    display: "form",
    components:
      filteredTabs.length === 1
        ? filteredTabs[0].components
        : [
          {
            label: "Tabs",
            key: "tabs",
            type: "tabs",
            input: false,
            tableView: false,
            components: filteredTabs,
          },
        ],
  };

  return schema;
}

// --------------------------------------------------------
// NEW SIMPLE CONVERTER STARTS HERE
// --------------------------------------------------------

export interface SimpleField {
  label: string;
  key: string;
  value: any;
  type: string;
  hidden: boolean;
  required: boolean;
  readOnly: boolean;
  options?: string[]; // New for Select fields
}

export interface SimpleTab {
  label: string;
  key: string;
  fields: SimpleField[];
  hidden: boolean;
  readOnly: boolean;
}

export interface SimpleTabbedData {
  tabs: SimpleTab[];
}

export async function convertFieldsToSimpleTabbedData(
  apiFields: any[],
  employeeData: any
): Promise<SimpleTabbedData> {
  if (!apiFields || !Array.isArray(apiFields)) {
    console.warn(
      "Invalid apiFields provided to convertFieldsToSimpleTabbedData:",
      apiFields
    );
    return { tabs: [] };
  }

  // Pre-fetch all table field metadata to avoid duplicate API calls
  await prefetchTableFields(apiFields);

  const tabs: SimpleTab[] = [];
  let currentTab: SimpleTab | null = null;

  let lastFieldType = "";

  const ensureCurrentTab = () => {
    if (!currentTab) {
      currentTab = {
        label: "Basic Details",
        key: "basic_details_tab",
        fields: [],
        hidden: false,
        readOnly: false,
      };
      tabs.push(currentTab);
    }
  };

  for (const field of apiFields) {
    if (!field || !field.fieldtype || field?.label === "Connections") continue;

    if (field.hidden === true || field.hidden === 1) continue;

    if (lastFieldType.endsWith(" Break") && field.fieldtype === lastFieldType) {
      continue;
    }

    if ((field.fieldtype.endsWith(" Break"))) {
      if (field.fieldtype === lastFieldType) {
        continue;
      }
      lastFieldType = field.fieldtype;
    } else {
      lastFieldType = field.fieldtype;
    }

    if (field.fieldtype === "Button") continue;

    if (field.fieldtype === "Tab Break") {
      const tabKey = field.fieldname || `tab_${tabs.length + 1}`;
      // Reclaim orphan basic_details_tab if already pushed, to avoid duplicates
      const orphanIdx = tabs.findIndex((t) => t.key === tabKey);
      if (orphanIdx !== -1) {
        currentTab = tabs.splice(orphanIdx, 1)[0];
        currentTab.label = field.label || currentTab.label;
        currentTab.hidden = !!field.hidden;
        currentTab.readOnly = !!field.read_only;
        tabs.push(currentTab);
      } else {
        currentTab = {
          label: field.label || `Tab ${tabs.length + 1}`,
          key: tabKey,
          fields: [],
          hidden: !!field.hidden,
          readOnly: !!field.read_only,
        };
        tabs.push(currentTab);
      }
    } else if (field.fieldtype === "Section Break") {
      ensureCurrentTab();
    } else if (field.fieldtype === "Column Break") {
      ensureCurrentTab();
    } else {
      // It's a field
      ensureCurrentTab();

      let fieldValue =
        employeeData[`${field.fieldname}_display`] !== undefined
          ? employeeData[`${field.fieldname}_display`]
          : employeeData[field.fieldname];

      // Standardize date format if it's a raw date string
      if (
        (field.fieldtype === "Date" || field.fieldtype === "Datetime") &&
        typeof fieldValue === "string" &&
        fieldValue
      ) {
        const date = parseISO(fieldValue);
        if (isValid(date)) {
          fieldValue = format(
            date,
            field.fieldtype === "Date" ? "dd-MM-yyyy" : "dd-MM-yyyy HH:mm:ss"
          );
        }
      }

      // Determine simpler type
      let simpleType = "text";
      if (["Int", "Float", "Currency", "Percent"].includes(field.fieldtype))
        simpleType = "number";
      else if (["Date", "Datetime", "Time"].includes(field.fieldtype))
        simpleType = "date";
      else if (["Select", "Link", "Dynamic Link"].includes(field.fieldtype))
        simpleType = "select";
      else if (["Check"].includes(field.fieldtype)) simpleType = "boolean";
      else if (["Attach", "Attach Image"].includes(field.fieldtype))
        simpleType = "file";
      else if (["Table"].includes(field.fieldtype)) simpleType = "table";

      const simpleField: SimpleField = {
        label: field.label || field.fieldname,
        key: field.fieldname,
        value: fieldValue,
        type: simpleType, // simplified type
        hidden: !!field.hidden,
        required: !!field.reqd,
        readOnly: !!field.read_only || READ_ONLY_FIELDS.includes(field.fieldname),
      };

      if (field.fieldtype === 'Table' && field.options) {
        const res = await getTableFields(field.options);
        const standardFields = new Set(['name', 'owner', 'creation', 'modified', 'modified_by', 'docstatus', 'idx', 'parent', 'parentfield', 'parenttype', 'doctype', 'amended_from']);
        const fieldMetaMap = new Map((res || []).map(f => [f.fieldname, f]));

        if (Array.isArray(fieldValue)) {
          // Map table rows using child field definitions or data keys
          simpleField.value = fieldValue.map((row: any) => {
            const rowData: Record<string, any> = {};

            // Iterate over all keys in the row to ensure we don't miss anything that has data
            Object.keys(row).forEach((key) => {
              if (standardFields.has(key)) return;
              if (key.endsWith('_display')) return; // handled via lookup

              const childField = fieldMetaMap.get(key);

              if (childField) {
                if (
                  childField.fieldtype === "Section Break" ||
                  childField.fieldtype === "Column Break"
                )
                  return;

                let childSimpleType = "text";
                if (
                  ["Int", "Float", "Currency", "Percent"].includes(
                    childField.fieldtype
                  )
                )
                  childSimpleType = "number";
                else if (
                  ["Date", "Datetime", "Time"].includes(childField.fieldtype)
                )
                  childSimpleType = "date";
                else if (
                  ["Select", "Link", "Dynamic Link"].includes(
                    childField.fieldtype
                  )
                )
                  childSimpleType = "select";
                else if (["Check"].includes(childField.fieldtype))
                  childSimpleType = "boolean";
                else if (["Attach", "Attach Image"].includes(childField.fieldtype))
                  childSimpleType = "file";

                let childValue =
                  row[`${childField.fieldname}_display`] !== undefined
                    ? row[`${childField.fieldname}_display`]
                    : row[childField.fieldname];

                // Standardize date format for child table fields
                if (
                  (childField.fieldtype === "Date" ||
                    childField.fieldtype === "Datetime") &&
                  childValue &&
                  typeof childValue === "string"
                ) {
                  const date = parseISO(childValue);
                  if (isValid(date)) {
                    childValue = format(
                      date,
                      childField.fieldtype === "Date"
                        ? "dd-MM-yyyy"
                        : "dd-MM-yyyy HH:mm:ss"
                    );
                  }
                }

                rowData[childField.fieldname] = {
                  value: childValue,
                  type: childSimpleType,
                  label: childField.label || childField.fieldname,
                };
              } else {
                // Fallback for fields not in metadata but present in data
                const value = row[key];
                if (value === null || value === undefined) return;

                rowData[key] = {
                  value: value,
                  type: "text",
                  label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                };
              }
            });
            return rowData;
          });
        }
      }

      if (field.options && typeof field.options === 'string') {
        simpleField.options = field.options.split('\n');
      }

      currentTab!.fields.push(simpleField);
    }
  }

  // Filter empty tabs if necessary
  const nonEmptyTabs = tabs.filter(t => t.fields.length > 0);

  return { tabs: nonEmptyTabs };
}
