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
        type: "textfield",
        key: "hiring_manager",
        label: "Hiring Manager",
        placeholder: "Ambreen Admin (TST_00045)",
        validate: { required: true },
      },
      {
        type: "select",
        key: "company",
        label: "Company",
        data: {
          values: [{ label: "Edtech", value: "edtech" }],
        },
        validate: { required: true },
      },
      {
        type: "select",
        key: "department",
        label: "Department",
        data: {
          values: [{ label: "Test Department (DEP_132)", value: "dep_132" }],
        },
        validate: { required: true },
      },
      {
        type: "select",
        key: "designation",
        label: "Designation",
        data: {
          values: [{ label: "Senior Associate (DES_360)", value: "des_360" }],
        },
        validate: { required: true },
      },
      {
        type: "select",
        key: "functional_area",
        label: "Functional Area",
        data: {
          values: [{ label: "EBM (HR_EBM)", value: "hr_ebm" }],
        },
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
                data: {
                  values: [
                    { label: "0", value: 0 },
                    { label: "1", value: 1 },
                    { label: "2", value: 2 },
                    { label: "3", value: 3 },
                    { label: "4", value: 4 },
                    { label: "5", value: 5 },
                  ],
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
                data: {
                  values: [
                    { label: "1", value: 1 },
                    { label: "2", value: 2 },
                    { label: "3", value: 3 },
                    { label: "5", value: 5 },
                    { label: "10", value: 10 },
                  ],
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
                data: {
                  values: [
                    { label: "₹ (INR)", value: "INR" },
                    { label: "$ (USD)", value: "USD" },
                  ],
                },
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
                data: {
                  values: [
                    { label: "Annual", value: "annual" },
                    { label: "Monthly", value: "monthly" },
                  ],
                },
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
                format: "yyyy-MM-dd",
                enableDate: true,
                enableTime: false,
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
                label: "Hiring lead",
                placeholder: "Select",
                data: {
                  values: [],
                },
                validate: { required: true },
                tooltip: "Select the hiring lead for this position",
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
        columns: [
          {
            components: [
              {
                type: "textarea",
                key: "additional_roles_responsibilities",
                label: "Additional Roles & Responsibilities",
                placeholder:
                  "Please add the additional roles and responsibilities of the candidates you want to hire for this role",
                rows: 5,
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
                key: "additional_skills",
                label: "Additional Skills",
                placeholder:
                  "Please Add the additional skills of the candidates you want to hire for this role",
                rows: 5,
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
      {
        type: "panel",
        title: "Position Details",
        key: "position_details_panel",
        components: [
          {
            type: "radio",
            key: "position_type",
            label: "Type of Position",
            values: [
              { label: "New", value: "new" },
              { label: "Replacement", value: "replacement" },
            ],
            customClass: "inline-radio-group",
            defaultValue: "new",
            validate: { required: true },
          },

          {
            type: "number",
            key: "number_of_new_positions",
            label: "Number of New Position(s)",
            conditional: {
              show: true,
              when: "position_type",
              eq: "new",
            },
          },
          {
            type: "number",
            key: "number_of_replacement_positions",
            label: "Number of Replacement Position(s)",
            conditional: {
              show: true,
              when: "position_type",
              eq: "replacement",
            },
          },
          {
            type: "number",
            key: "number_of_positions",
            label: "Number of Position(s)",
            default: 5,
            // suffix: '<span class="text-muted">Max Position Allowed: 👁️</span>',
            description: "(Max Allowed Positions per Requisition is 100)",
          },
        ],
      },
      {
        type: "panel",
        title: "Position Details",
        key: "position_details_table",
        components: [
          {
            type: "datagrid",
            key: "positions",
            label: "Position Details",
            addAnother: "Add Position",
            components: [
              {
                type: "number",
                key: "position_number",
                label: "Position Number",
                disabled: true,
              },
              {
                type: "select",
                key: "location",
                label: "Location",
                placeholder: "Select Location",
                data: {
                  values: [
                    { label: "Branch Office - Mumbai", value: "mumbai" },
                    { label: "Prayagraj, Uttar Pradesh", value: "prayagraj" },
                    {
                      label: "Corporate Office, Uttar Pradesh",
                      value: "corporate_up",
                    },
                  ],
                },
                validate: { required: true },
              },
              {
                type: "select",
                key: "functional_area",
                label: "Functional Area",
                placeholder: "Select",
                data: {
                  values: [
                    {
                      label: "Facility Manager (ASS_O...)",
                      value: "facility_manager",
                    },
                  ],
                },
              },
              {
                type: "select",
                key: "reporting_manager",
                label: "Reporting manager",
                placeholder: "Search Employees",
                data: {
                  values: [
                    { label: "Gopal Sharma (PW1005)", value: "pw1005" },
                    { label: "Geetanjali . (PW0616)", value: "pw0616" },
                    { label: "Anjali Sharma (TST_00047)", value: "tst_00047" },
                    { label: "Anjali Kumari (PW1882)", value: "pw1882" },
                  ],
                },
                validate: { required: true },
              },
              {
                type: "select",
                key: "employee_type",
                label: "Employee Type",
                placeholder: "Select",
                data: {
                  values: [
                    { label: "Full Time", value: "full_time" },
                    { label: "Part Time", value: "part_time" },
                    { label: "Contract", value: "contract" },
                  ],
                },
                validate: { required: true },
              },
            ],
            conditional: {
              show: true,
              when: "position_type",
              eq: "new",
            },
          },
          {
            type: "datagrid",
            key: "replacement_positions",
            label: "Position Details",
            addAnother: "Add Position",
            components: [
              {
                type: "number",
                key: "position_number",
                label: "Position Number",
                disabled: true,
              },
              {
                type: "select",
                key: "location",
                label: "Location",
                placeholder: "Select Location",
                data: {
                  values: [
                    {
                      label: "Corporate Office, Uttar Pradesh",
                      value: "corporate_up",
                    },
                  ],
                },
                validate: { required: true },
              },
              {
                type: "textfield",
                key: "replacement_for",
                label: "Replacement for",
                placeholder: "Search Employees",
                validate: { required: true },
              },
              {
                type: "select",
                key: "reporting_manager",
                label: "Reporting manager",
                placeholder: "Search Employees",
                data: {
                  values: [],
                },
                validate: { required: true },
              },
              {
                type: "select",
                key: "employee_type",
                label: "Employee Type",
                placeholder: "Select",
                data: {
                  values: [
                    { label: "Full Time", value: "full_time" },
                    { label: "Part Time", value: "part_time" },
                    { label: "Contract", value: "contract" },
                  ],
                },
                validate: { required: true },
              },
            ],
            conditional: {
              show: true,
              when: "position_type",
              eq: "replacement",
            },
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
        label: "Comments / Instructions",
        rows: 4,
      },
      {
        type: "textfield",
        key: "cost_centre",
        label: "Cost Centre",
        validate: { required: true },
      },
      {
        type: "textfield",
        key: "designation_change",
        label: "Designation Change",
      },
    ],
  },
};

export type FormSchemaKeys = keyof typeof requisitionFormSchemas;
