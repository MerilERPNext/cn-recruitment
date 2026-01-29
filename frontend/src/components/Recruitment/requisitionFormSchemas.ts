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
        placeholder: "Select Hiring Manager",
        dataSrc: "url",
        data: {
          url: '/api/resource/Employee?fields=["name","employee_name"]',
          headers: [{ key: "Accept", value: "application/json" }],
        },
        selectValues: "data",
        valueProperty: "name",
        template:
          "<span>{{ item.employee_name }} <span style='color:#7f8c8d'>({{item.name}})</span></span>",
        validate: {
          required: true,
        },
      },

      {
        type: "select",
        key: "company",
        label: "Company",
        placeholder: "Select Company",
        input: true,
        dataSrc: "url",
        data: {
          url: '/api/resource/Company?fields=["name"]',
          headers: [{ key: "Accept", value: "application/json" }],
        },
        selectValues: "data",
        valueProperty: "name",
        template: "<span>{{ item.name }}</span>",
        validate: { required: true },
      },

      {
        type: "select",
        key: "department",
        label: "Department",
        placeholder: "Select Department",
        input: true,
        dataSrc: "url",
        data: {
          url: '/api/resource/Department?filters=[["company","=","{{ data.company }}"]]',
          headers: [{ key: "Accept", value: "application/json" }],
        },
        selectValues: "data",
        valueProperty: "name",
        template: "<span>{{ item.name }}</span>",
        validate: { required: true },
        refreshOn: "company",
        clearOnRefresh: true,
      },

      {
        type: "select",
        key: "designation",
        label: "Designation",
        placeholder: "Select Designation",
        input: true,
        dataSrc: "url",
        data: {
          url: '/api/resource/Designation?filters=[["custom_department","=","{{ data.department }}"]]',
          headers: [{ key: "Accept", value: "application/json" }],
        },
        selectValues: "data",
        valueProperty: "name",
        template: "<span>{{ item.name }}</span>",
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
          url: '/api/resource/Functional Area?filters=[["designation","=","{{ data.designation }}"]]',
          headers: [{ key: "Accept", value: "application/json" }],
        },
        selectValues: "data",
        valueProperty: "name",
        template: "<span>{{ item.name }}</span>",
        refreshOn: "designation",
        clearOnRefresh: true,
        customConditional: "show = !!data.designation",
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
                dataSrc: "url",
                data: {
                  url: '/api/resource/Currency?fields=["name"]',
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                selectValues: "data",
                valueProperty: "name",
                template: "<span>{{ item.name }}</span>",
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
                placeholder: "Select Hiring Lead",
                dataSrc: "url",
                data: {
                  url: '/api/resource/Employee?fields=["name","employee_name"]',
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                selectValues: "data",
                valueProperty: "name",
                template:
                  "<span>{{ item.employee_name }} <span style='color:#7f8c8d'>({{item.name}})</span></span>",
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
            defaultValue: 1,
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
                key: "location",
                label: "Location",
                placeholder: "Select Location",
                dataSrc: "url",
                data: {
                  url: "/api/resource/Branch",
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                selectValues: "data",
                valueProperty: "name",
                template: "<span>{{ item.name }}</span>",
                validate: { required: true },
              },
              {
                type: "select",
                key: "functional_area",
                label: "Functional Area",
                placeholder: "Select",
                dataSrc: "url",
                data: {
                  url: '/api/resource/Functional Area?fields=["name"]',
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                selectValues: "data",
                valueProperty: "name",
                template: "<span>{{ item.name }}</span>",
              },
              {
                type: "select",
                key: "reporting_manager",
                label: "Reporting manager",
                placeholder: "Search Employees",
                dataSrc: "url",
                data: {
                  url: '/api/resource/Employee?fields=["name","employee_name"]',
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                selectValues: "data",
                valueProperty: "name",
                template:
                  "<span>{{ item.employee_name }} <span style='color:#7f8c8d'>({{item.name}})</span></span>",
                validate: { required: true },
              },
              {
                type: "select",
                key: "employee_type",
                label: "Employee Type",
                placeholder: "Select",
                dataSrc: "url",
                data: {
                  url: "/api/resource/Employment Type",
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                selectValues: "data",
                valueProperty: "name",
                template: "<span>{{ item.name }}</span>",
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
                type: "select",
                key: "replacement_for",
                label: "Replacement for",
                placeholder: "Search Employees",
                dataSrc: "url",
                data: {
                  url: '/api/resource/Employee?fields=["name","employee_name"]',
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                selectValues: "data",
                valueProperty: "name",
                template:
                  "<span>{{ item.employee_name }} <span style='color:#7f8c8d'>({{item.name}})</span></span>",
                validate: { required: true },
              },
              {
                type: "select",
                key: "reporting_manager",
                label: "Reporting manager",
                placeholder: "Search Employees",
                dataSrc: "url",
                data: {
                  url: '/api/resource/Employee?fields=["name","employee_name"]',
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                selectValues: "data",
                valueProperty: "name",
                template:
                  "<span>{{ item.employee_name }} <span style='color:#7f8c8d'>({{item.name}})</span></span>",
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