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
          url: '/api/resource/Designation',
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
          url: '/api/resource/Functional Area',
          headers: [{ key: "Accept", value: "application/json" }],
        },
        selectValues: "data",
        valueProperty: "name",
        template: "<span>{{ item.name }}</span>",
        refreshOn: "designation",
        clearOnRefresh: true,
        customConditional: "show = !!data.designation",
      },
      {
        type: "select",
        key: "custom_division",
        label: "Division",
        placeholder: "Select Division",
        input: true,
        dataSrc: "url",
        data: {
          url: '/api/resource/Division?fields=["name"]',
          headers: [{ key: "Accept", value: "application/json" }],
        },
        selectValues: "data",
        valueProperty: "name",
        template: "<span>{{ item.name }}</span>",
      },
      {
        type: "select",
        key: "status",
        label: "Status",
        data: {
          values: [
            { label: "Pending", value: "Pending" },
            { label: "Approved", value: "Approved" },
            { label: "Open", value: "Open" },
          ],
        },
        defaultValue: "Pending",
        validate: { required: true },
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
        customClass: "my-3",
        columns: [
          {
            components: [
              {
                type: "number",
                key: "expected_compensation",
                label: "Expected Compensation",
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
                format: "yyyy-MM-dd",
                enableDate: true,
                enableTime: false,
                validate: { required: true },
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
                key: "employment_type",
                label: "Employment Type (Link)",
                placeholder: "Select Employment Type",
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
            width: 6,
            offset: 0,
            push: 0,
            pull: 0,
          },
          {
            components: [
              {
                type: "select",
                key: "custom__employee_type",
                label: "Employee Type",
                placeholder: "Select Employee Type",
                data: {
                  values: [
                    { label: "Full Time", value: "Full Time" },
                    { label: "Part Time", value: "Part Time" },
                    { label: "Consultant", value: "Consultant" },
                    { label: "Intern", value: "Intern" },
                  ],
                },
                validate: { required: true },
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
                label: "Target Location",
                placeholder: "Select Location",
                dataSrc: "url",
                data: {
                  url: "/api/resource/Location",
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                selectValues: "data",
                valueProperty: "name",
                template: "<span>{{ item.name }}</span>",
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
                  url: "/api/resource/Company",
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                selectValues: "data",
                valueProperty: "name",
                template: "<span>{{ item.name }}</span>",
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
          {
            components: [
              {
                type: "select",
                key: "job_description_template",
                label: "Job Description Template",
                placeholder: "Select Template",
                dataSrc: "url",
                data: {
                  url: "/api/resource/Job Description Template",
                  headers: [{ key: "Accept", value: "application/json" }],
                },
                selectValues: "data",
                valueProperty: "name",
                template: "<span>{{ item.name }}</span>",
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
        key: "custom_skills",
        label: "Required Skills",
        placeholder: "Select Skills",
        multiple: true,
        input: true,
        dataSrc: "url",
        data: {
          url: '/api/resource/Skill?fields=["name"]',
          headers: [{ key: "Accept", value: "application/json" }],
        },
        selectValues: "data",
        valueProperty: "name",
        template: "<span>{{ item.name }}</span>",
      },
      {
        type: "columns",
        customClass: "my-3",
        columns: [
          {
            components: [
              {
                type: "textarea",
                key: "description",
                label: "Job Description (HTML)",
                placeholder: "<p>Job Description details...</p>",
                rows: 4,
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
                key: "reason_for_requesting",
                label: "Reason for Requesting",
                placeholder: "Enter details here...",
                rows: 4,
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
                  url: '/api/resource/Functional Area',
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
      {
        type: "textfield",
        key: "custom_assign_to_recruiter",
        label: "Assign to Recruiter (Email)",
        placeholder: "e.g., recruiter@company.com",
      },
      {
        type: "datagrid",
        key: "custom_pre_screened_candidates",
        label: "Pre-Screened Candidates",
        addAnother: "Add Candidate",
        components: [
          {
            type: "textfield",
            key: "candidate_name",
            label: "Candidate Name",
            placeholder: "e.g., Maya Krishnan",
            validate: { required: true },
          },
          {
            type: "textfield",
            key: "email",
            label: "Email",
            placeholder: "e.g., candidate@email.com",
            validate: { required: true },
          },
          {
            type: "textfield",
            key: "phone",
            label: "Phone",
            placeholder: "e.g., +91...",
          },
          {
            type: "checkbox",
            key: "offer_directly",
            label: "Offer Directly?",
            defaultValue: false,
          },
        ],
      },
    ],
  },
};

export type FormSchemaKeys = keyof typeof requisitionFormSchemas;