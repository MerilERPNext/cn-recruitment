/* eslint-disable @typescript-eslint/no-explicit-any */
export interface TableField {
  fieldname: string;
  label: string;
  fieldtype: string;
  options: string;
  reqd: number;
  read_only: number;
  in_list_view: number;
  default: unknown;
}

export interface ApplicationField {
  section: string;
  reference_name: string;
  display_name: string;
  fieldtype: string;
  options: string;
  reqd: number;
  ctq: number;
  visibility: string;
  editability: string;
  value?: unknown;
  // For `fieldtype: "Table"`, the API sends the child-table column definitions
  // here. When present these are rendered dynamically (instead of any hardcoded
  // fallback) so every column from the API shows up with the correct key.
  table_fields?: TableField[];
}

export interface FormioComponent {
  type: string;
  key: string;
  label: string;
  title?: string;
  placeholder?: string;
  input?: boolean;
  disabled?: boolean;
  customClass?: string;       // e.g. "required-field" to show red asterisk via formio.custom.css
  validate?: {
    required?: boolean;
    pattern?: string;
    customMessage?: string;
  };
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
  multiple?: boolean;
  components?: FormioComponent[];
  addAnother?: string;
  defaultValue?: any;
  // Panel / button extras used by the stacked child-table layout.
  collapsible?: boolean;
  collapsed?: boolean;
  action?: string;
  event?: string;
  theme?: string;
  block?: boolean;
  properties?: Record<string, string>;
}

export interface FormioSchema {
  components: FormioComponent[];
}

/**
 * Maps a single child-table sub-field (from the API's `table_fields`) to a
 * Form.io component, using `key` for the flat per-row binding key
 * (`${reference_name}_${rowIndex}_${fieldname}`). Mirrors the top-level mapping
 * and IJPApplyView so child tables render + validate the same way.
 */
const buildTableSubField = (sub: TableField, key: string): FormioComponent => {
  const { label, fieldtype, options, reqd, read_only } = sub;
  const isRequired = reqd === 1;
  const isReadOnly = read_only === 1;
  const base: FormioComponent = {
    type: "textfield",
    key,
    label,
    input: true,
    ...(isReadOnly && { disabled: true }),
    ...(isRequired && { customClass: "required-field" }),
    validate: { required: isRequired, customMessage: `${label} is required` },
  };

  switch (fieldtype) {
    case "Select": {
      const values = options
        ? options.split(/[\n,]/).map((o) => o.trim()).filter(Boolean).map((o) => ({ label: o, value: o }))
        : [];
      return { ...base, type: "select", placeholder: `Select ${label.toLowerCase()}`, data: { values }, template: "<span>{{ item.label }}</span>" };
    }
    case "Check":
      return { ...base, type: "checkbox" };
    case "Date":
      return { ...base, type: "datetime", placeholder: `Select ${label.toLowerCase()}`, format: "dd-MM-yyyy", enableDate: true, enableTime: false };
    case "Int":
    case "Float":
    case "Currency":
      return { ...base, type: "number", placeholder: `Enter ${label.toLowerCase()}` };
    case "Small Text":
    case "Text":
    case "Long Text":
    case "Text Editor":
      return { ...base, type: "textarea", placeholder: `Enter ${label.toLowerCase()}` };
    case "Link":
      return {
        ...base,
        type: "select",
        placeholder: `Select ${label}`,
        dataSrc: "url",
        data: {
          url: `/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=${options}`,
          headers: [{ key: "Accept", value: "application/json" }],
        },
        selectValues: "message.results",
        valueProperty: "id",
        template: "<span>{{ item.label }}</span>",
        // Server-side search (see top-level Link note) — fetch matching options
        // as the user types instead of loading the whole list.
        lazyLoad: true,
        searchField: "search_text",
        limit: 100,
      };
    case "Attach":
      // Inline URL entry inside the entry panel (no per-cell dropzone).
      return { ...base, placeholder: "Paste attachment URL..." };
    case "Data":
    default:
      return { ...base, placeholder: `Enter ${label.toLowerCase()}` };
  }
};

/**
 * Compiles a list of dynamic application fields into a Form.io JSON schema.
 *
 * `rowCounts` controls how many entry panels each `Table` field renders (keyed
 * by reference_name). Child tables render as stacked vertical panels — each
 * entry's fields laid out in a column — exactly like IJPApplyView, with flat
 * per-row keys `${reference_name}_${rowIndex}_${fieldname}`.
 */
export const compileFormioSchema = (
  fields: ApplicationField[],
  rowCounts: Record<string, number> = {}
): FormioSchema => {
  // 1. Group fields by section
  const sectionsMap = new Map<string, ApplicationField[]>();

  fields.forEach(field => {
    if (field.visibility === "None") return;
    const sectionName = field.section || "General Details";
    if (!sectionsMap.has(sectionName)) sectionsMap.set(sectionName, []);
    sectionsMap.get(sectionName)!.push(field);
  });

  const components: FormioComponent[] = [];

  // 2. Build Form.io panel for each section
  sectionsMap.forEach((sectionFields, sectionName) => {
    const panelComponents: FormioComponent[] = [];

    sectionFields.forEach(field => {
      const { reference_name, display_name, fieldtype, options, reqd } = field;
      const isRequired = reqd === 1;

      if (fieldtype === "Table") {
        // Render each entry as a stacked vertical panel (fields in a column),
        // like IJPApplyView — not a wide datagrid. Row count is driven by
        // `rowCounts`; entries bind to flat keys `${ref}_${i}_${fieldname}`.
        const tableFields = field.table_fields || [];
        if (tableFields.length === 0) return;
        const rowCount = rowCounts[reference_name] ?? (isRequired ? 1 : 0);

        if (rowCount > 0) {
          const entryPanels: FormioComponent[] = [];
          for (let i = 0; i < rowCount; i++) {
            const rowComponents = tableFields.map((sub) =>
              buildTableSubField(sub, `${reference_name}_${i}_${sub.fieldname}`)
            );
            // Per-entry delete button. Fires a custom form.io event captured by
            // AddNewReferral's onCustomEvent, which removes this row and shifts
            // the remaining entries' flat keys down.
            rowComponents.push({
              type: "button",
              key: `${reference_name}__removeEntry__${i}`,
              label: "Remove Entry",
              input: true,
              action: "event",
              event: "removeTableEntry",
              theme: "danger",
              block: false,
              customClass: "ref-remove-entry-btn",
              properties: { tableRef: reference_name, rowIndex: String(i) },
            });
            entryPanels.push({
              type: "panel",
              key: `${reference_name}_panel_${i}`,
              label: `${display_name} - Entry #${i + 1}`,
              title: `${display_name} - Entry #${i + 1}`,
              components: rowComponents,
              collapsible: true,
              collapsed: i !== rowCount - 1,
              customClass:
                "py-3 px-5 bg-slate-50 border border-slate-200 rounded-xl mb-4 formio-section-panel",
            } as FormioComponent);
          }

          panelComponents.push({
            type: "well",
            key: reference_name,
            label: display_name,
            components: entryPanels,
            customClass: "mb-2",
          } as FormioComponent);
        }

        // Add-entry button — rendered in-schema right after the table so it sits
        // directly below the entries (above any following fields), not at the
        // bottom of the section. Captured by onCustomEvent to bump the row count.
        panelComponents.push({
          type: "button",
          key: `${reference_name}__addEntry`,
          label: rowCount === 0 ? `+ Add ${display_name}` : `+ Add More ${display_name}`,
          input: true,
          action: "event",
          event: "addTableEntry",
          theme: "primary",
          block: false,
          customClass: "ref-add-entry-btn",
          properties: { tableRef: reference_name },
        });
        return;
      }

      if (fieldtype === "Attach") {
        // Rendered via a custom React dropzone in AddNewReferral; mark read-only here
        panelComponents.push({
          type: "textfield",
          key: reference_name,
          label: display_name,
          placeholder: "Upload attachment below or paste URL...",
          input: true,
          disabled: true,
          validate: { required: isRequired },
          ...(isRequired && { customClass: "required-field" })
        });
        return;
      }

      switch (fieldtype) {
        case "Data": {
          const isEmail =
            options === "Email" || reference_name.toLowerCase().includes("email");
          panelComponents.push({
            type: "textfield",
            key: reference_name,
            label: display_name,
            placeholder: `Enter ${display_name.toLowerCase()}`,
            input: true,
            ...(isRequired && { customClass: "required-field" }),
            validate: {
              required: isRequired,
              ...(isEmail && {
                pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
                customMessage: "Please enter a valid email address."
              })
            }
          });
          break;
        }

        case "Select": {
          const values = options
            ? options.split("\n").map(o => o.trim()).filter(Boolean).map(o => ({ label: o, value: o }))
            : [];
          panelComponents.push({
            type: "select",
            key: reference_name,
            label: display_name,
            placeholder: `Select ${display_name.toLowerCase()}`,
            input: true,
            data: { values },
            ...(isRequired && { customClass: "required-field" }),
            validate: { required: isRequired }
          });
          break;
        }

        case "Check": {
          panelComponents.push({
            type: "checkbox",
            key: reference_name,
            label: display_name,
            input: true,
            ...(isRequired && { customClass: "required-field" }),
            validate: { required: isRequired }
          });
          break;
        }

        case "Date": {
          panelComponents.push({
            type: "datetime",
            key: reference_name,
            label: display_name,
            placeholder: `Select ${display_name.toLowerCase()}`,
            format: "dd-MM-yyyy",
            enableTime: false,
            input: true,
            ...(isRequired && { customClass: "required-field" }),
            validate: { required: isRequired },
            widget: {
              type: "calendar",
              displayInTimezone: "viewer",
              locale: "en",
              useLocaleSettings: false,
              allowInput: true,
              mode: "single",
              enableTime: false,
              noCalendar: false,
              format: "dd-MM-yyyy",
              hourIncrement: 1,
              minuteIncrement: 5,
              time_24hr: false,
              minDate: null,
              disabledDates: "",
              maxDate: null
            }
          } as any);
          break;
        }

        case "Small Text":
        case "Text": {
          panelComponents.push({
            type: "textarea",
            key: reference_name,
            label: display_name,
            placeholder: `Enter ${display_name.toLowerCase()}`,
            input: true,
            ...(isRequired && { customClass: "required-field" }),
            validate: { required: isRequired }
          });
          break;
        }

        case "Link": {
          panelComponents.push({
            type: "select",
            key: reference_name,
            label: display_name,
            placeholder: `Select ${display_name}`,
            input: true,
            dataSrc: "url",
            data: {
              url: `/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=${options}`,
              headers: [{ key: "Accept", value: "application/json" }]
            },
            selectValues: "message.results",
            valueProperty: "id",
            template: "<span>{{ item.label }}</span>",
            // Server-side search instead of loading the whole list (which lags
            // for large link doctypes like Country/Employee). form.io sends the
            // typed text as `search_text`, which the backend filters on, and
            // only fetches matching options on demand.
            lazyLoad: true,
            searchField: "search_text",
            limit: 100,
            ...(isRequired && { customClass: "required-field" }),
            validate: { required: isRequired }
          });
          break;
        }

        default: {
          panelComponents.push({
            type: "textfield",
            key: reference_name,
            label: display_name,
            placeholder: `Enter ${display_name.toLowerCase()}`,
            input: true,
            ...(isRequired && { customClass: "required-field" }),
            validate: { required: isRequired }
          });
          break;
        }
      }
    });

    components.push({
      type: "panel",
      title: sectionName,
      key: `${sectionName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_panel`,
      label: sectionName,
      components: panelComponents
    });
  });

  return { components };
};