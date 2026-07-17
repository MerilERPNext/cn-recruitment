export interface FormStep {
  label: string;
  key: string;
}

export const requisitionSteps: FormStep[] = [
  { label: "Basic Details", key: "basicDetails" },
  { label: "Job Details", key: "jobDetails" },
  { label: "Position Selection", key: "positionSelection" },
  { label: "Other Details", key: "otherDetails" },
];

export const requisitionFormSchemas = {
  basicDetails: {
    components: [
      {
        type: "select",
        key: "hiring_manager",
        label: "Hiring Manager",
        customClass: "required-field",
        placeholder: "Select Hiring Manager",
        dataSrc: "url",
        data: {
          url: '/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Employee',
          headers: [{ key: "Accept", value: "application/json" }],
        },
        selectValues: "message.results",
        valueProperty: "id",
        template:
          "<span>{{ item.label }} <span style='color:#7f8c8d'>({{item.id}})</span></span>",
        validate: {
          required: true,
          limit: 20,

        },
      },

      {
        type: "select",
        key: "company",
        label: "Company",
        customClass: "required-field",
        placeholder: "Select Company",
        input: true,
        dataSrc: "url",
        data: {
          url: '/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Company',
          headers: [{ key: "Accept", value: "application/json" }],
        },
        selectValues: "message.results",
        valueProperty: "id",
        template: "<span>{{ item.label }}</span>",
        validate: { required: true },
        limit: 20,

      },

      {
        type: "select",
        key: "department",
        label: "Department",
        customClass: "required-field",
        placeholder: "Select Department",
        input: true,
        dataSrc: "url",
        data: {
          url: '/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Department&company={{ data.company }}&disabled=0',
          headers: [{ key: "Accept", value: "application/json" }],
        },
        selectValues: "message.results",
        valueProperty: "id",
        template: "<span>{{ item.label }}</span>",
        validate: { required: true },
        refreshOn: "company",
        clearOnRefresh: true,
        limit: 20,

      },

      {
        type: "select",
        key: "designation",
        label: "Designation",
        customClass: "required-field",
        placeholder: "Select Designation",
        input: true,
        dataSrc: "url",
        data: {
          url: '/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Designation&custom_department={{ data.department }}&custom_status=Active',
          headers: [{ key: "Accept", value: "application/json" }],
        },
        selectValues: "message.results",
        valueProperty: "id",
        template: "<span>{{ item.label }}</span>",
        validate: { required: true },
        refreshOn: "department",
        clearOnRefresh: true,
        limit: 20,

      },

      {
        // Functional Area is auto-derived from the selected Designation
        // (Designation.custom_functional_area), so it is READ-ONLY and NOT
        // mandatory. The value is populated by RequisitionForm when the
        // designation changes.
        type: "select",
        key: "functional_area",
        label: "Functional Area",
        placeholder: "Auto-filled from Designation",
        input: true,
        disabled: true,
        dataSrc: "url",
        data: {
          url: '/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Functional Area&designation={{ data.designation }}&disabled=0',
          headers: [{ key: "Accept", value: "application/json" }],
        },
        selectValues: "message.results",
        valueProperty: "id",
        template: "<span>{{ item.label }}</span>",
        refreshOn: "designation",
        validate: { required: false },
        limit: 20,

      },
    ],
  },
  jobDetails: {
    components: [
      {
        type: "columns",
        customClass: "my-3",
        columns: [
          {
            components: [
              {
                type: "select",
                key: "experience_from",
                label: "Experience Range - From",
                placeholder: "Select",
                data: {
                  values: Array.from({ length: 50 }, (_, i) => ({
                    label: i.toString(),
                    value: i,
                  })),
                },
              },
            ],
            width: 4,
            offset: 0,
            push: 0,
            pull: 0,
          },
          {
            components: [
              {
                type: "select",
                key: "experience_to",
                label: "To",
                placeholder: "Select",
                data: {
                  values: Array.from({ length: 50 }, (_, i) => ({
                    label: (i + 1).toString(),
                    value: i + 1,
                  })),
                },
                validate: {
                  custom:
                    "valid = (input >= data.experience_from) ? true : 'To must be greater than or equal to From'",
                },
              },
            ],
            width: 4,
            offset: 0,
            push: 0,
            pull: 0,
          },

          {
            components: [
              {
                type: "select",
                key: "experience_unit",
                label: "Unit",
                data: {
                  values: [
                    { label: "years", value: "years" },
                    { label: "months", value: "months" },
                  ],
                },
                defaultValue: "years",
              },
            ],
            width: 4,
            offset: 0,
            push: 0,
            pull: 0,
          },
        ],
      },
      {
        type: "columns",
        customClass: "my-3",
        columns: [
          {
            components: [
              {
                type: "select",
                key: "salary_currency",
                label: "Salary Range (Currency)",
                customClass: "required-field",
                dataSrc: "url",
                data: {
                  url: '/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Currency',
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                selectValues: "message.results",
                valueProperty: "id",
                template: "<span>{{ item.label }}</span>",
                defaultValue: "INR",
                validate: { required: true },
                limit: 20,

              },
            ],
            width: 3,
            offset: 0,
            push: 0,
            pull: 0,
          },
          {
            components: [
              {
                type: "textfield",
                key: "salary_min",
                label: "Salary Range (Min)",
                customClass: "required-field",
                placeholder: "Min Salary",
                validate: {
                  required: true,
                  custom: `
                    const minSalary = Number(input || 0);
                    const maxSalary = Number(data.salary_max || 0);
              
                    if (maxSalary && minSalary >= maxSalary) {
                      valid = 'Min Salary must be less than Max Salary';
                    } else {
                      valid = true;
                    }
                  `,
                },
              }
            ],
            width: 3,
            offset: 0,
            push: 0,
            pull: 0,
          },
          {
            components: [
              {
                type: "textfield",
                key: "salary_max",
                label: "Salary Range (Max)",
                customClass: "required-field",
                placeholder: "Max Salary",
                validate: {
                  required: true,
                  custom: `
                    const minSalary = Number(data.salary_min || 0);
                    const maxSalary = Number(input || 0);
              
                    valid = maxSalary > minSalary
                      ? true
                      : 'Max Salary must be greater than Min Salary';
                  `,
                },
              }
            ],
            width: 3,
            offset: 0,
            push: 0,
            pull: 0,
          },
          {
            components: [
              {
                type: "select",
                key: "salary_timeframe",
                label: "Salary Timeframe",
                customClass: "required-field",
                data: {
                  values: [
                    { label: "Hourly", value: "Hourly" },
                    { label: "Daily", value: "Daily" },
                    { label: "Weekly", value: "Weekly" },
                    { label: "Fortnightly", value: "Fortnightly" },
                    { label: "Monthly", value: "Monthly" },
                    { label: "Annual", value: "Annual" },
                  ],
                },
                defaultValue: "Annual",
                validate: { required: true },
              },
            ],
            width: 3,
            offset: 0,
            push: 0,
            pull: 0,
          },
        ],
      },
      {
        type: "columns",
        customClass: "my-3",
        columns: [
          {
            components: [
              {
                type: "datetime",
                key: "recruitment_start_date",
                label: "Recruitment Start Date",
                format: "dd-MM-yyyy",
                enableDate: true,
                enableTime: false,
                // Edit mode: keep the API's posting_date (mapped into
                // recruitment_start_date). Create mode: default to today.
                // Guarded so a redraw never overwrites an existing value.
                // No minDate so an edit's past posting_date still renders.
                customDefaultValue:
                  "value = data.recruitment_start_date ? data.recruitment_start_date : moment().format('YYYY-MM-DD')",
              },
            ],
            width: 6,
            offset: 0,
            push: 0,
            pull: 0,
          },
          {
            components: [
              {
                type: "select",
                key: "hiring_lead",
                label: "Hiring Lead",
                placeholder: "Select Hiring Lead",
                input: true,
                dataSrc: "url",
                data: {
                  // company -> Company Wise config match; hiring_manager (the
                  // requisition's Employee) -> Assignment Framework config match.
                  url: '/api/method/recruitment.api.job_requisition.get_hiring_lead_employees?company={{ data.company }}&employee={{ data.hiring_manager }}',
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                refreshOn: ["company", "hiring_manager"],
                limit: 20,
                selectValues: "message.results",
                valueProperty: "employee",
                template:
                  "<span>{{ item.employee_name }} <span style='color:#7f8c8d'>({{item.employee}})</span></span>",
              },
              
            ],
            width: 6,
            offset: 0,
            push: 0,
            pull: 0,
          },
        ],
      },
      {
        type: "htmlelement",
        tag: "div",
        className: "alert alert-info mt-4 rounded-md",
        content:
          '<i class="fa fa-info-circle mr-2"></i> Fill below sections if you have any specific instruction for recruiters',
      },
      {
        type: "columns",
        customClass: "my-3",
        columns: [
          {
            components: [
              {
                type: "datetime",
                key: "expected_by",
                label: "Expected By Date",
                customClass: "required-field",
                format: "dd-MM-yyyy",
                validate: { required: true },
                enableTime: false,
                datePicker: { minDate: "moment()" },
              },
            ],
            width: 6,
            offset: 0,
            push: 0,
            pull: 0,
          },
          {
            components: [
              {
                type: "select",
                key: "employment_type",
                label: "Employment Type (Link)",
                customClass: "required-field",
                placeholder: "Select Employment Type",
                dataSrc: "url",
                data: {
                  url: "/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Employment Type&custom_company={{ data.company }}",
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                selectValues: "message.results",
                valueProperty: "id",
                template: "<span>{{ item.label }}</span>",
                validate: { required: true },
                refreshOn: "company",
                clearOnRefresh: true,
                limit: 20,

              },
            ],
            width: 6,
            offset: 0,
            push: 0,
            pull: 0,
          },
        ],
      },
      {
        type: "columns",
        customClass: "my-3",
        columns: [
          {
            components: [
              {
                type: "select",
                key: "location",
                label: "Work Location",
                customClass: "required-field",
                placeholder: "Select Branch",
                dataSrc: "url",
                data: {
                  url: "/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Branch&company={{ data.company }}",
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                selectValues: "message.results",
                valueProperty: "id",
                template: "<span>{{ item.label }}</span>",
                validate: { required: true },
                refreshOn: "company",
                clearOnRefresh: true,
                limit: 20,

              },
            ],
            width: 6,
            offset: 0,
            push: 0,
            pull: 0,
          },
          {
            components: [
              {
                type: "select",
                key: "custom_preferred_notice_period",
                label: "Preferred Notice Period",
                placeholder: "Select Notice Period",
                data: {
                  values: [
                    { label: "Immediate", value: "Immediate" },
                    { label: "15 Days", value: "15 Days" },
                    { label: "30 Days", value: "30 Days" },
                    { label: "60 Days", value: "60 Days" },
                    { label: "90 Days", value: "90 Days" },
                  ],
                },
              },
            ],
            width: 6,
            offset: 0,
            push: 0,
            pull: 0,
          },
        ],
      },
      {
        type: "columns",
        customClass: "my-3",
        columns: [
          {
            components: [
              {
                type: "select",
                key: "preferred_company",
                label: "Preferred Target Company",
                placeholder: "Select Company",
                dataSrc: "url",
                data: {
                  url: "/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Preferred Target Company",
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                limit: 20,
                selectValues: "message.results",
                valueProperty: "id",
                template: "<span>{{ item.label }}</span>",
              },
            ],
            width: 6,
            offset: 0,
            push: 0,
            pull: 0,
          },
          {
            components: [
              {
                type: "textfield",
                key: "custom_other_preferred_companies",
                label: "Other Preferred Companies",
                placeholder: "e.g., Razorpay, Cred, Postman",
              },
            ],
            width: 6,
            offset: 0,
            push: 0,
            pull: 0,
          },
        ],
      },
      {
        type: "columns",
        customClass: "my-3",
        columns: [
          {
            components: [
              {
                type: "select",
                key: "custom_skills",
                label: "Required Skills",
                placeholder: "Select Skills",
                multiple: true,
                input: true,
                dataSrc: "url",
                data: {
                  url: '/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Skill',
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                limit: 20,
                selectValues: "message.results",
                valueProperty: "id",
                template: "<span>{{ item.label }}</span>",
              },
            ],
            width: 6,
            offset: 0,
            push: 0,
            pull: 0,
          },
          {
            components: [
              {
                type: "textarea",
                key: "additional_roles_responsibilities",
                label: "Position Specific Requirements",
                placeholder: "Enter position specific requirements",
                input: true,
              },
            ],
            width: 6,
            offset: 0,
            push: 0,
            pull: 0,
          },
        ],
      },
    ],
  },
  positionSelection: {
    components: [
      // Info banner shown only above the Position Details section.
      {
        type: "htmlelement",
        tag: "div",
        className:
          "flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 text-blue-800 px-3 py-2.5 mb-3 text-sm",
        content:
          '<i class="fa fa-info-circle mt-0.5 text-blue-500"></i><span><strong>Note:</strong> Create a separate requisition for each different work location. If multiple positions belong to the same location, they should be included within a single requisition.</span>',
      },
      // NOTE: The Total / New / Replacement count inputs are rendered as plain
      // React inputs in RequisitionForm.tsx (currentStep === 2) to avoid the
      // form.io controlled-input override issue. They must NOT be duplicated as
      // a form.io panel here or the fields render twice.
      {
        type: "panel",
        title: "Position Details Table",
        key: "position_details_table",
        components: [
          {
            type: "datagrid",
            key: "positions",
            label: "Position Details",
            // Start with NO rows on create (form.io datagrids otherwise seed one
            // empty row, which would force Total Position to 1). Rows are added
            // as the user enters the Total Position count.
            initEmpty: true,
            disableAddingRemovingRows: true,
            addAnother: "",
            removeRow: "",
            components: [
              {
                type: "number",
                key: "position_number",
                label: "Position Number",
                disabled: true,
              },
              {
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
              },
              {
                type: "select",
                key: "location",
                label: "Location",
                placeholder: "Select Location",
                // Validate only after the field is touched, so newly-added
                // empty position rows don't show "required" red on render.
                validateOn: "blur",
                dataSrc: "url",
                data: {
                  // Scoped to the requisition's company (top-level `data.company`).
                  url: "/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Branch&company={{ data.company }}",
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                limit: 20,
                selectValues: "message.results",
                valueProperty: "id",
                template: "<span>{{ item.label }}</span>",
                refreshOn: "company",
                clearOnRefresh: true,
                validate: { required: true },
              },
              {
                // Auto-derived from the requisition's Designation → every row
                // mirrors the top-level Functional Area. Read-only, not
                // mandatory; `calculateValue` copies the requisition value into
                // each position row automatically.
                type: "select",
                key: "functional_area",
                label: "Functional Area",
                placeholder: "Auto-filled from Designation",
                disabled: true,
                dataSrc: "url",
                data: {
                  url: '/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Functional Area&designation={{ data.designation }}&disabled=0',
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                selectValues: "message.results",
                valueProperty: "id",
                limit: 20,
                template: "<span>{{ item.label }}</span>",
                validate: { required: false },
              },
              {
                type: "select",
                key: "reporting_manager",
                label: "Reporting manager",
                placeholder: "Search Employees",
                // Validate only after the field is touched (see note above).
                validateOn: "blur",
                dataSrc: "url",
                data: {
                  url: '/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Employee',
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                limit: 20,
                selectValues: "message.results",
                valueProperty: "id",
                template:
                  "<span>{{ item.label }} <span style='color:#7f8c8d'>({{item.id}})</span></span>",
                validate: { required: true },
              },
              {
                type: "select",
                key: "replacement_for",
                label: "Replacement for",
                placeholder: "Search Employees",
                // Validate only after the field is touched (see note above).
                validateOn: "blur",
                dataSrc: "url",
                data: {
                  // Pass the requisition's own designation/company so the backend
                  // can apply the 'Restriction for Replacement Employee Selection'
                  // setting (Same Designation / Same Group Company / None).
                  url: '/api/method/recruitment.api.job_requisition.get_replacement_employee_options?designation={{ data.designation }}&company={{ data.company }}',
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                selectValues: "message.results",
                valueProperty: "id",
                template:
                  "<span>{{ item.label }} <span style='color:#7f8c8d'>({{item.id}})</span></span>",
                validate: { required: true },
                refreshOn: "company",
                clearOnRefresh: true,
                customConditional: "show = row.vacancy_type === 'Replacement'",
              },
              {
                // Child table: multiple cost centers per position, each with
                // its own percentage allocation.
                type: "datagrid",
                key: "cost_center_allocations",
                label: "Cost Center Allocation",
                addAnother: "Add Cost Center",
                reorder: false,
                components: [
                  {
                    type: "select",
                    key: "cost_center",
                    label: "Cost Center",
                    placeholder: "Select Cost Center",
                    validateOn: "blur",
                    dataSrc: "url",
                    data: {
                      url: "/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Cost Center",
                      headers: [{ key: "Accept", value: "application/json" }],
                    },
                    // Use Form.io's Choices widget so Cost Centers can be searched.
                    // Keep the URL select lazy inside this nested datagrid: loading
                    // every row during a grid redraw is expensive and can reset the
                    // open dropdown while a new allocation row is being added.
                    widget: "choicesjs",
                    lazyLoad: true,
                    searchEnabled: true,
                    limit: 20,
                    selectValues: "message.results",
                    valueProperty: "id",
                    template: "<span>{{ item.label }}</span>",
                    // Mandatory — shows the required asterisk on the column header.
                    // validateOn: "blur" (above) keeps empty rows from flagging
                    // red on render.
                    validate: {
                      required: true,
                      // Reject the same Cost Center selected twice in the same
                      // position's allocation table.
                      custom: `
                        var allocs = [];
                        if (instance && instance.parent && Array.isArray(instance.parent.dataValue)) {
                          allocs = instance.parent.dataValue;
                        } else {
                          var positions = (data && data.positions) || [];
                          for (var pi = 0; pi < positions.length; pi++) {
                            var p = positions[pi];
                            if (p && Array.isArray(p.cost_center_allocations) && p.cost_center_allocations.indexOf(row) !== -1) {
                              allocs = p.cost_center_allocations; break;
                            }
                          }
                        }
                        var dup = false;
                        if (input) {
                          for (var k = 0; k < allocs.length; k++) {
                            if (allocs[k] === row) continue;
                            if (allocs[k] && String(allocs[k].cost_center) === String(input)) { dup = true; break; }
                          }
                        }
                        valid = dup ? 'This Cost Center is already selected in this position' : true;
                      `,
                    },
                  },
                  {
                    type: "number",
                    key: "percentage",
                    label: "Percentage (%)",
                    placeholder: "e.g., 100",
                    // Mandatory — shows the required asterisk on the column header.
                    validateOn: "blur",
                    validate: {
                      required: true,
                      min: 0,
                      max: 100,
                      // The sum of all allocation percentages in a position must
                      // not exceed 100%.
                      custom: `
                        var allocs = [];
                        if (instance && instance.parent && Array.isArray(instance.parent.dataValue)) {
                          allocs = instance.parent.dataValue;
                        } else {
                          var positions = (data && data.positions) || [];
                          for (var pi = 0; pi < positions.length; pi++) {
                            var p = positions[pi];
                            if (p && Array.isArray(p.cost_center_allocations) && p.cost_center_allocations.indexOf(row) !== -1) {
                              allocs = p.cost_center_allocations; break;
                            }
                          }
                        }
                        var sum = Number(input) || 0;
                        for (var k = 0; k < allocs.length; k++) {
                          if (allocs[k] === row) continue;
                          sum += Number(allocs[k] && allocs[k].percentage) || 0;
                        }
                        valid = sum > 100 ? ('Total cost center allocation cannot exceed 100% (currently ' + sum + '%)') : true;
                      `,
                    },
                  },
                ],
              },
            ],
          },
          {
            // Fresher requisitions use Regions instead of Position Details.
            // The dynamic config layer keeps only the table returned by the
            // Hiring Type-specific configuration response.
            type: "datagrid",
            key: "custom_regions",
            label: "Regions",
            initEmpty: true,
            addAnother: "Add Region",
            reorder: false,
            components: [
              {
                type: "select",
                key: "region",
                label: "Region",
                placeholder: "Select Region",
                validateOn: "blur",
                dataSrc: "url",
                data: {
                  url: "/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Region",
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                limit: 20,
                selectValues: "message.results",
                valueProperty: "id",
                template: "<span>{{ item.label }}</span>",
                validate: { required: true },
              },
              {
                type: "number",
                key: "no_of_openings",
                label: "No. of Openings",
                validateOn: "blur",
                validate: { required: true, min: 1 },
              },
            ],
          },
        ],
      },
    ],
  },
  otherDetails: {
    components: [
      {
        type: "textarea",
        key: "comments_instructions",
        label: "Comments / Instruction",
        placeholder: "Enter any comments or instructions for recruiters",
        input: true,
        rows: 3,
      },
      {
        type: "datagrid",
        key: "custom_qualifications",
        label: "Qualifications",
        addAnother: "Add Qualification",
        customClass: "required-field",
        components: [
          {
            type: "textfield",
            key: "qualification",
            label: "Qualification",
            placeholder: "e.g., B.Com, B.Tech",
            validate: { required: true },
          },
          {
            type: "select",
            key: "mandatory",
            label: "Mandatory?",
            data: {
              values: [
                { label: "Required", value: "Required" },
                { label: "Preferred", value: "Preferred" },
              ],
            },
            defaultValue: "Required",
            validate: { required: true },
          },
        ],
      },
    ],
  },
};

export type FormSchemaKeys = keyof typeof requisitionFormSchemas;

// ---------------------------------------------------------------------------
// Job Details (JD) tab — field list driving the in-form "Preview" popup.
// Ordered to mirror the on-screen layout.
//   key        → the formData key the value is read from
//   label      → what the preview popup shows
//   backendKey → the Job Requisition field this value maps to when the preview
//                payload is wired to the API later (feature, not now)
// Keep this in sync with the `jobDetails` schema above.
// ---------------------------------------------------------------------------
export interface JobDetailsPreviewField {
  key: string;
  label: string;
  backendKey: string;
}

export const jobDetailsPreviewFields: JobDetailsPreviewField[] = [
  { key: "experience_from", label: "Experience Range - From", backendKey: "custom_experience_range_from" },
  { key: "experience_to", label: "Experience Range - To", backendKey: "custom_experience_range_to" },
  { key: "experience_unit", label: "Experience Unit", backendKey: "custom_experience_unit" },
  { key: "salary_currency", label: "Salary Range (Currency)", backendKey: "custom_salary_range_currency" },
  { key: "salary_min", label: "Salary Range (Min)", backendKey: "custom_salary_range_min" },
  { key: "salary_max", label: "Salary Range (Max)", backendKey: "custom_salary_range_max" },
  { key: "salary_timeframe", label: "Salary Timeframe", backendKey: "custom_salary_timeframe" },
  { key: "recruitment_start_date", label: "Recruitment Start Date", backendKey: "posting_date" },
  { key: "expected_compensation", label: "Expected Compensation", backendKey: "expected_compensation" },
  { key: "expected_by", label: "Expected By Date", backendKey: "expected_by" },
  { key: "employment_type", label: "Employment Type", backendKey: "custom_employment_type_link" },
  { key: "location", label: "Work Location", backendKey: "custom_location" },
  { key: "vacancy_type", label: "Vacancy Type", backendKey: "custom_vacancy_type" },
  { key: "functional_area", label: "Functional Area", backendKey: "custom_functional_area" },
  { key: "custom_work_experience_range", label: "Work Experience Range", backendKey: "custom_work_experience_range" },
  { key: "custom_preferred_notice_period", label: "Preferred Notice Period", backendKey: "custom_preferred_notice_period" },
  { key: "preferred_company", label: "Preferred Target Company", backendKey: "custom_preferred_company" },
  { key: "custom_other_preferred_companies", label: "Other Preferred Companies", backendKey: "custom_other_preferred_companies" },
  { key: "custom_skills", label: "Required Skills", backendKey: "custom_skills" },
]; 
