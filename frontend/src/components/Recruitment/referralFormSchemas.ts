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
  format?: string;
  enableDate?: boolean;
  enableTime?: boolean;
  multiple?: boolean;
  components?: FormioComponent[];
  addAnother?: string;
  defaultValue?: any;
}

export interface FormioSchema {
  components: FormioComponent[];
}

/**
 * Gets standard schema components for known child tables.
 */
const getChildTableSchema = (doctype: string): FormioComponent[] => {
  switch (doctype) {
    case "Employee Education":
      return [
        { type: "textfield", key: "qualification",     label: "Degree / Qualification", input: true, validate: { required: true } },
        { type: "textfield", key: "school_university", label: "School / Institution",   input: true, validate: { required: true } },
        { type: "textfield", key: "year_of_passing",   label: "Year of Passing",        input: true, validate: { required: false } },
        { type: "textfield", key: "class_percentage",  label: "Score / Percentage",     input: true, validate: { required: false } }
      ];
    case "Employee External Work History":
      return [
        { type: "textfield", key: "company_name", label: "Company Name", input: true, validate: { required: true } },
        { type: "textfield", key: "designation",  label: "Designation",  input: true, validate: { required: true } },
        { type: "datetime",  key: "from_date",    label: "From Date",    format: "dd-MM-yyyy", enableDate: true, enableTime: false, input: true },
        { type: "datetime",  key: "to_date",      label: "To Date",      format: "dd-MM-yyyy", enableDate: true, enableTime: false, input: true },
        { type: "textfield", key: "salary",        label: "Salary / CTC", input: true }
      ];
    case "Job Applicant Pre Offer Form":
      return [
        { type: "textfield", key: "form_name",    label: "Form Name",     input: true, validate: { required: true } },
        { type: "checkbox",  key: "is_mandatory", label: "Is Mandatory",  input: true }
      ];
    default:
      return [
        { type: "textfield", key: "name",        label: "Name / Title", input: true, validate: { required: true } },
        { type: "textarea",  key: "description", label: "Description",  input: true }
      ];
  }
};

/**
 * Compiles a list of dynamic application fields into a Form.io JSON schema.
 */
export const compileFormioSchema = (fields: ApplicationField[]): FormioSchema => {
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
        panelComponents.push({
          type: "datagrid",
          key: reference_name,
          label: display_name,
          addAnother: `Add ${display_name}`,
          input: true,
          components: getChildTableSchema(options),
          validate: { required: isRequired },
          ...(isRequired && { customClass: "required-field" })
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