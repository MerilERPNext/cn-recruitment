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

function mapFieldToFormio(field: any): any {
  const type = formioFieldTypeMap[field.fieldtype] || "textfield";

  const schema: any = {
    label: field.label || field.fieldname,
    key: field.fieldname,
    type,
    input: type !== "content", // content type doesn't accept input
    tableView: true,
    validate: {},
    defaultValue: field.value ?? "",
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

    case "Link":
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
      schema.storage = "base64"; // or 'url' depending on your setup
      schema.fileTypes =
        field.fieldtype === "Attach Image"
          ? [{ label: "Images", value: "image/*" }]
          : [];
      schema.multiple = false;
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
  if (
    field.fieldtype === "Section Break" ||
    field.fieldtype === "Column Break"
  ) {
    schema.customClass = "formio-layout-break";
  }

  // Set placeholder if not set and field has one
  if (!schema.placeholder && field.placeholder) {
    schema.placeholder = field.placeholder;
  }

  return schema;
}

export function convertToFormioWithLayout(apiFields: any[]): any {
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
    if (currentColumns && currentSection) {
      currentSection.components.push(currentColumns);
      currentColumns = null;
    }
    if (currentSection && currentTab) {
      currentTab.components.push(currentSection);
      currentSection = null;
    }
  };

  // Helper function to ensure we have a current tab
  const ensureCurrentTab = () => {
    if (!currentTab) {
      currentTab = {
        label: "General",
        key: "general",
        components: [],
      };
    }
  };

  for (const field of apiFields) {
    // Skip fields that shouldn't be rendered
    if (!field || !field.fieldtype) continue;

    // Skip hidden system fields
    if (field.fieldtype === "Button" || field.hidden === 1) continue;

    if (field.fieldtype === "Tab Break") {
      // Close existing structures
      closeCurrentStructures();
      if (currentTab) {
        tabs.push(currentTab);
      }

      // Start new tab
      currentTab = {
        label: field.label || `Tab ${tabs.length + 1}`,
        key: field.fieldname || `tab_${tabs.length + 1}`,
        components: [],
        input: false,
        tableView: false,
      };
    } else if (field.fieldtype === "Section Break") {
      // Close previous structures
      if (currentColumns && currentSection) {
        currentSection.components.push(currentColumns);
        currentColumns = null;
      }
      if (currentSection && currentTab) {
        currentTab.components.push(currentSection);
      }

      // Ensure we have a current tab
      ensureCurrentTab();

      // Start new section
      currentSection = {
        type: "panel",
        title: field.label || "",
        key:
          field.fieldname ||
          `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        components: [],
        input: false,
        tableView: false,
        collapsible: field.collapsible || false,
        collapsed: (field.collapsible && field.collapsed) || false,
      };

      // Add description if available
      if (field.description) {
        currentSection.tooltip = field.description;
      }

      currentColumns = null;
    } else if (field.fieldtype === "Column Break") {
      // Ensure we have structures to work with
      ensureCurrentTab();

      if (!currentSection) {
        currentSection = {
          type: "panel",
          title: "",
          key: `auto_section_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`,
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
            .substr(2, 9)}`,
          columns: [],
          input: false,
          tableView: false,
        };
      }

      // Add new column
      currentColumns.columns.push({
        components: [],
        width: 6, // Default to half width, can be customized
        offset: 0,
        push: 0,
        pull: 0,
        size: "md",
      });
      currentColumnIndex = currentColumns.columns.length - 1;
    } else {
      // Regular field - map it to FormIO
      const mapped = mapFieldToFormio(field);

      if (!mapped) continue; // Skip if mapping failed

      // Ensure we have a structure to put the field in
      ensureCurrentTab();

      if (currentColumns && currentColumns.columns.length > 0) {
        // Put field inside current column
        currentColumns.columns[currentColumnIndex].components.push(mapped);
      } else if (currentSection) {
        // Put field inside current section
        currentSection.components.push(mapped);
      } else {
        // Put field directly in tab
        currentTab.components.push(mapped);
      }
    }
  }

  // Flush remaining open structures
  closeCurrentStructures();
  if (currentTab) {
    tabs.push(currentTab);
  }

  // If no tabs were created, create a single general tab
  if (tabs.length === 0) {
    tabs.push({
      label: "General",
      key: "general",
      components: [],
      input: false,
      tableView: false,
    });
  }

  // Create the final FormIO schema
  const schema = {
    type: "form",
    display: "form",
    components:
      tabs.length === 1
        ? tabs[0].components // If only one tab, don't wrap in tabs component
        : [
            {
              label: "Tabs",
              key: "tabs",
              type: "tabs",
              input: false,
              tableView: false,
              components: tabs,
            },
          ],
    settings: {
      pdf: {
        id: "1ec0f8ee-6685-5d98-a847-26f67b67d6f0",
        src: "https://files.form.io/pdf/5692b91fd1028f01000407e3/file/1ec0f8ee-6685-5d98-a847-26f67b67d6f0",
      },
    },
  };

  return schema;
}

// Utility function to convert FormIO submission back to Frappe format
export function convertFromFormioSubmission(
  submission: any,
  originalFields: any[]
): any {
  if (!submission || !originalFields) {
    return {};
  }

  const result: any = {};

  // Create a map of fieldname to field definition for quick lookup
  const fieldMap = new Map();
  originalFields.forEach((field) => {
    if (field.fieldname) {
      fieldMap.set(field.fieldname, field);
    }
  });

  // Convert each submitted value back to Frappe format
  Object.keys(submission).forEach((key) => {
    const field = fieldMap.get(key);
    const value = submission[key];

    if (!field || value === null || value === undefined) {
      result[key] = value;
      return;
    }

    switch (field.fieldtype) {
      case "Check":
        result[key] = value ? 1 : 0;
        break;
      case "Date":
        result[key] = value
          ? new Date(value).toISOString().split("T")[0]
          : null;
        break;
      case "Datetime":
        result[key] = value ? new Date(value).toISOString() : null;
        break;
      case "Time":
        result[key] = value;
        break;
      case "Currency":
      case "Float":
        result[key] = parseFloat(value) || 0;
        break;
      case "Int":
        result[key] = parseInt(value) || 0;
        break;
      case "Percent":
        result[key] = parseFloat(value) || 0;
        break;
      default:
        result[key] = value;
    }
  });

  return result;
}

// Helper function to validate FormIO schema
export function validateFormioSchema(schema: any): boolean {
  if (!schema || typeof schema !== "object") {
    console.error("Schema is not a valid object");
    return false;
  }

  if (!Array.isArray(schema.components)) {
    console.error("Schema must have a components array");
    return false;
  }

  return true;
}

// Helper function to get all field keys from a FormIO schema
export function getFormioFieldKeys(schema: any): string[] {
  const keys: string[] = [];

  function extractKeys(components: any[]) {
    components.forEach((component) => {
      if (component.key && component.input) {
        keys.push(component.key);
      }
      if (component.components) {
        extractKeys(component.components);
      }
      if (component.columns) {
        component.columns.forEach((column: any) => {
          if (column.components) {
            extractKeys(column.components);
          }
        });
      }
    });
  }

  if (schema.components) {
    extractKeys(schema.components);
  }

  return keys;
}
