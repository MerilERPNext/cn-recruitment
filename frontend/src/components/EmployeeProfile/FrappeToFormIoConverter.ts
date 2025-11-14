/* eslint-disable @typescript-eslint/no-explicit-any */

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
  "Table MultiSelect": "selectboxes",

  // Visual fields
  Color: "textfield", // FormIO doesn't have native color picker
  Barcode: "textfield",

  // Location field
  Geolocation: "textfield", // FormIO doesn't have native map component

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
      if (field.options) {
        schema.data = {
          values: field.options
            .split("\n")
            .filter(Boolean)
            .map((opt: string) => ({ label: opt.trim(), value: opt.trim() })),
        };
      }
      break;

    case "Link": {
      schema.type = "select";
      schema.dataSrc = "url";
      schema.searchEnabled = true;

      schema.data = {
        url: `/api/method/nextai.funnel.apis.fetch_data.get_searched_doc_list?fields=*`,
      };

      schema.filter = `doctype=${field?.options ?? ""}&limit=20`;
      schema.dataType = "string";
      schema.idPath = "name";
      schema.valueProperty = "name";
      schema.selectValues = "message";
      schema.searchField = "q";

      schema.template = `
    <span>{{ item.title || item.label || item.full_name || item.fullname || item.first_name || item.name }}</span>
  `;

      break;
    }

    case "Dynamic Link":
      // For Link fields, we'll treat them as select fields with empty options
      // In a real implementation, you'd fetch the linked doctype's records
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
        format: "yyyy-MM-dd",
        useLocaleSettings: false,
        allowInput: true,
        clickOpens: true,
        enableTime: false,
        mode: "single",
      };
      schema.format = "yyyy-MM-dd";
      schema.placeholder = "Enter date";
      break;

    case "Datetime":
      schema.widget = {
        type: "calendar",
        displayInTimezone: "viewer",
        timezone: "default",
        format: "yyyy-MM-dd HH:mm:ss",
        useLocaleSettings: false,
        allowInput: true,
        clickOpens: true,
        enableTime: true,
        mode: "single",
      };
      schema.format = "yyyy-MM-dd HH:mm:ss";
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
        schema.defaultValue = "";
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
  if (field.read_only) {
    schema.disabled = true;
  }

  // Handle custom CSS classes
  if (field.fieldtype === "Column Break") {
    schema.customClass = "formio-layout-break";
  }

  // Set placeholder if not set and field has one
  if (!schema.placeholder && field.placeholder) {
    schema.placeholder = field.placeholder;
  }

  return schema;
}

export function convertToFormioWithLayout(
  apiFields: any[],
  employeeData: any
): any {
  if (!apiFields || !Array.isArray(apiFields)) {
    console.warn(
      "Invalid apiFields provided to convertToFormioWithLayout:",
      apiFields
    );
    return { components: [] };
  }

  const tabs: any[] = [];
  let currentTab: any = null;
  let currentSection: any = null;
  let currentColumns: any = null;
  let currentColumnIndex = 0;

  // Helper function to close current structures
  const closeCurrentStructures = () => {
    // If there are buffered fields and no columns were created,
    // add them directly to the section
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
        label: "General",
        key: "general",
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

      currentTab = {
        label: field.label || `Tab ${tabs.length + 1}`,
        key: field.fieldname || `tab_${tabs.length + 1}`,
        components: [],
        input: false,
        tableView: false,
      };
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
            content: `<h4 style="font-weight:600; font-size:1.05rem; margin:8px 0 12px;">${field.label}</h4>`,
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
      const mapped = mapFieldToFormio(field, fieldValue);
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

  // ✅ Helper: detect if a tab or section actually contains inputs
  const hasInputs = (components: any[]): boolean =>
    components?.some((comp) => {
      if (comp.input) return true;
      if (comp.components && hasInputs(comp.components)) return true;
      if (
        comp.columns &&
        comp.columns.some((col: any) => hasInputs(col.components))
      )
        return true;
      return false;
    });

  // ✅ Remove empty sections (panels without inputs)
  tabs.forEach((tab) => {
    tab.components = tab.components.filter(
      (comp: any) =>
        comp.type !== "panel" || (comp.components && hasInputs(comp.components))
    );
  });

  // ✅ Remove empty tabs (those without any inputs)
  const filteredTabs = tabs.filter((tab) => hasInputs(tab.components));

  // If no tabs were created, create a single general tab
  if (filteredTabs.length === 0) {
    filteredTabs.push({
      label: "General",
      key: "general",
      components: [],
      input: false,
      tableView: false,
    });
  }

  // ✅ Final schema
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
