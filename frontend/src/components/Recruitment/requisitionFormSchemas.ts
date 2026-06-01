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
          url: '/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Department&company={{ data.company }}',
          headers: [{ key: "Accept", value: "application/json" }],
        },
        selectValues: "message.results",
        valueProperty: "id",
        template: "<span>{{ item.label }}</span>",
        validate: { required: true },
        refreshOn: "company",
        clearOnRefresh: true,
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
          url: '/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Designation&department={{ data.department }}',
          headers: [{ key: "Accept", value: "application/json" }],
        },
        selectValues: "message.results",
        valueProperty: "id",
        template: "<span>{{ item.label }}</span>",
        validate: { required: true },
        refreshOn: "department",
        clearOnRefresh: true,
      },

      {
        type: "select",
        key: "functional_area",
        label: "Functional Area",
        placeholder: "Select Functional Area",
        input: true,
        dataSrc: "url",
        data: {
          url: '/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Functional Area&designation={{ data.designation }}',
          headers: [{ key: "Accept", value: "application/json" }],
        },
        selectValues: "message.results",
        valueProperty: "id",
        template: "<span>{{ item.label }}</span>",
        refreshOn: "designation",
        clearOnRefresh: true,
      },
    ],
  },
  jobDetails: {
    components: [
      {
        type: "htmlelement",
        tag: "div",
        className:
          "alert bg-orange-500/10 border-orange-500/10 text-warning-600 mt-3 rounded-md",
        content:
          '<i class="fa fa-exclamation-triangle mr-2"></i> There is no job description tagged to this designation. Please configure the job description by contacting your recruiter.',
      },
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
                validate: { required: true },
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
                key: "salary_max",
                label: "Salary Range (Max)",
                customClass: "required-field",
                placeholder: "Max Salary",
                validate: { required: true },
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
        type: "datetime",
        key: "recruitment_start_date",
        label: "Recruitment Start Date",
        format: "yyyy-MM-dd",
        enableDate: true,
        enableTime: false,
        widget: { type: "calendar", minDate: new Date() },
        datePicker: { minDate: new Date() },
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
                type: "number",
                key: "expected_compensation",
                label: "Expected Compensation",
                customClass: "required-field",
                placeholder: "e.g., 600000",
                validate: { required: true },
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
                type: "datetime",
                key: "expected_by",
                label: "Expected By Date",
                customClass: "required-field",
                format: "yyyy-MM-dd",
                enableDate: true,
                enableTime: false,
                validate: { required: true },
                widget: { type: "calendar", minDate: new Date() },
                datePicker: { minDate: new Date() },
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
        type: "select",
        key: "employment_type",
        label: "Employment Type (Link)",
        customClass: "required-field",
        placeholder: "Select Employment Type",
        dataSrc: "url",
        data: {
          url: "/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Employment Type",
          headers: [{ key: "Accept", value: "application/json" }],
        },
        selectValues: "message.results",
        valueProperty: "id",
        template: "<span>{{ item.label }}</span>",
        validate: { required: true },
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
                  url: "/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Branch",
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                selectValues: "message.results",
                valueProperty: "id",
                template: "<span>{{ item.label }}</span>",
                validate: { required: true },
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
                key: "custom_work_experience_range",
                label: "Work Experience Range",
                placeholder: "Select Work Experience Range",
                data: {
                  values: [
                    { label: "Fresher", value: "Fresher" },
                    { label: "1 - 3 Years", value: "1 - 3 Years" },
                    { label: "4 - 5 Years", value: "4 - 5 Years" },
                    { label: "5 - 10 Years", value: "5 - 10 Years" },
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
          {
            components: [
              {
                type: "select",
                key: "preferred_company",
                label: "Preferred Target Company",
                placeholder: "Select Company",
                dataSrc: "url",
                data: {
                  url: "/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Company",
                  headers: [{ key: "Accept", value: "application/json" }],
                },
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
        ],
      },
      {
        type: "textfield",
        key: "custom_other_preferred_companies",
        label: "Other Preferred Companies",
        placeholder: "e.g., Razorpay, Cred, Postman",
      },
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
        selectValues: "message.results",
        valueProperty: "id",
        template: "<span>{{ item.label }}</span>",
      },
    ],
  },
  positionSelection: {
    components: [
      // NOTE: "Total Position / New / Replacement" inputs are rendered as plain
      // React inputs in RequisitionForm.tsx (outside formio). Keeping them inside
      // the controlled formio form caused a Controlled Input Override: handleChange
      // transforms their value (clamp + rebuild positions) and feeds it back, which
      // makes @tsed/react-formio reset the whole submission mid-typing.
      {
        type: "panel",
        title: "Position Details Table",
        key: "position_details_table",
        components: [
          {
            type: "datagrid",
            key: "positions",
            label: "Position Details",
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
                customClass: "required-field",
                placeholder: "Select Location",
                dataSrc: "url",
                data: {
                  url: "/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Branch",
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                selectValues: "message.results",
                valueProperty: "id",
                template: "<span>{{ item.label }}</span>",
                validate: { required: true },
              },
              {
                type: "select",
                key: "functional_area",
                label: "Functional Area",
                placeholder: "Select Area",
                dataSrc: "url",
                data: {
                  url: '/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Functional Area',
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                selectValues: "message.results",
                valueProperty: "id",
                template: "<span>{{ item.label }}</span>",
              },
              {
                type: "select",
                key: "reporting_manager",
                label: "Reporting manager",
                placeholder: "Search Employees",
                dataSrc: "url",
                data: {
                  url: '/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Employee',
                  headers: [{ key: "Accept", value: "application/json" }],
                },
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
                customClass: "required-field",
                placeholder: "Search Employees",
                dataSrc: "url",
                data: {
                  url: '/api/method/recruitment.api.job_requisition.get_link_field_options?doctype=Employee',
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                selectValues: "message.results",
                valueProperty: "id",
                template:
                  "<span>{{ item.label }} <span style='color:#7f8c8d'>({{item.id}})</span></span>",
                validate: { required: true },
                customConditional: "show = row.vacancy_type === 'Replacement'",
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
        type: "datagrid",
        key: "custom_qualifications",
        label: "Qualifications",
        addAnother: "Add Qualification",
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