export interface IJPFormStep {
  label: string;
  key: string;
}

export const ijpApplicationSteps: IJPFormStep[] = [
  { label: "Biographical", key: "biographical" },
  { label: "Contact", key: "contact" },
  { label: "Address", key: "address" },
  { label: "Work Experience", key: "workExperience" },
  { label: "Education", key: "education" },
  { label: "Social Security", key: "socialSecurity" },
  { label: "Education Section", key: "educationSection" },
];

export const ijpApplicationSchemas: Record<string, { components: object[] }> = {
  biographical: {
    components: [
      {
        type: "columns",
        customClass: "my-2",
        columns: [
          {
            width: 6,
            components: [
              {
                type: "textfield",
                key: "first_name",
                label: "First Name",
                placeholder: "",
                validate: { required: true },
                input: true,
              },
            ],
          },
          {
            width: 6,
            components: [
              {
                type: "textfield",
                key: "last_name",
                label: "Last Name",
                placeholder: "",
                validate: { required: true },
                input: true,
              },
            ],
          },
        ],
      },
      {
        type: "columns",
        customClass: "my-2",
        columns: [
          {
            width: 6,
            components: [
              {
                type: "textfield",
                key: "full_name",
                label: "Full Name",
                placeholder: "",
                input: true,
              },
            ],
          },
          {
            width: 6,
            components: [
              {
                type: "textfield",
                key: "nationality",
                label: "Nationality (Naukri)",
                placeholder: "",
                input: true,
              },
            ],
          },
        ],
      },
      {
        type: "columns",
        customClass: "my-2",
        columns: [
          {
            width: 6,
            components: [
              {
                type: "select",
                key: "gender",
                label: "Gender",
                placeholder: "Select Gender",
                input: true,
                data: {
                  values: [
                    { label: "Male", value: "male" },
                    { label: "Female", value: "female" },
                    { label: "Other", value: "other" },
                  ],
                },
              },
            ],
          },
          {
            width: 6,
            components: [
              {
                type: "datetime",
                key: "date_of_birth",
                label: "Date of Birth",
                format: "yyyy-MM-dd",
                input: true,
                enableDate: true,
                enableTime: false,
                datePicker: { minDate: null, maxDate: "now" },
              },
            ],
          },
        ],
      },
      {
        type: "columns",
        customClass: "my-2",
        columns: [
          {
            width: 6,
            components: [
              {
                type: "select",
                key: "marital_status",
                label: "Marital Status",
                placeholder: "Select",
                input: true,
                data: {
                  values: [
                    { label: "Single", value: "single" },
                    { label: "Married", value: "married" },
                    { label: "Divorced", value: "divorced" },
                    { label: "Widowed", value: "widowed" },
                  ],
                },
              },
            ],
          },
          {
            width: 6,
            components: [
              {
                type: "textfield",
                key: "fathers_name",
                label: "Father's Name",
                placeholder: "",
                input: true,
              },
            ],
          },
        ],
      },
    ],
  },

  contact: {
    components: [
      {
        type: "columns",
        customClass: "my-2",
        columns: [
          {
            width: 6,
            components: [
              {
                type: "email",
                key: "email",
                label: "Email Address",
                placeholder: "Enter email",
                validate: { required: true },
                input: true,
              },
            ],
          },
          {
            width: 6,
            components: [
              {
                type: "phoneNumber",
                key: "mobile_number",
                label: "Mobile Number",
                placeholder: "Enter mobile number",
                validate: { required: true },
                input: true,
              },
            ],
          },
        ],
      },
      {
        type: "columns",
        customClass: "my-2",
        columns: [
          {
            width: 6,
            components: [
              {
                type: "phoneNumber",
                key: "alternate_phone",
                label: "Alternate Phone",
                placeholder: "Enter alternate phone",
                input: true,
              },
            ],
          },
          {
            width: 6,
            components: [
              {
                type: "textfield",
                key: "linkedin_url",
                label: "LinkedIn URL",
                placeholder: "https://linkedin.com/in/...",
                input: true,
              },
            ],
          },
        ],
      },
    ],
  },

  address: {
    components: [
      {
        type: "columns",
        customClass: "my-2",
        columns: [
          {
            width: 6,
            components: [
              {
                type: "textfield",
                key: "address_line_1",
                label: "Address Line 1",
                placeholder: "Street / Plot Number",
                validate: { required: true },
                input: true,
              },
            ],
          },
          {
            width: 6,
            components: [
              {
                type: "textfield",
                key: "address_line_2",
                label: "Address Line 2",
                placeholder: "Area / Locality",
                input: true,
              },
            ],
          },
        ],
      },
      {
        type: "columns",
        customClass: "my-2",
        columns: [
          {
            width: 4,
            components: [
              {
                type: "textfield",
                key: "city",
                label: "City",
                validate: { required: true },
                input: true,
              },
            ],
          },
          {
            width: 4,
            components: [
              {
                type: "textfield",
                key: "state",
                label: "State",
                validate: { required: true },
                input: true,
              },
            ],
          },
          {
            width: 4,
            components: [
              {
                type: "textfield",
                key: "pincode",
                label: "Pincode / ZIP",
                validate: { required: true },
                input: true,
              },
            ],
          },
        ],
      },
      {
        type: "columns",
        customClass: "my-2",
        columns: [
          {
            width: 6,
            components: [
              {
                type: "select",
                key: "country",
                label: "Country",
                placeholder: "Select Country",
                validate: { required: true },
                input: true,
                data: {
                  values: [
                    { label: "India", value: "india" },
                    { label: "USA", value: "usa" },
                    { label: "UK", value: "uk" },
                    { label: "UAE", value: "uae" },
                    { label: "Singapore", value: "singapore" },
                    { label: "Other", value: "other" },
                  ],
                },
              },
            ],
          },
          {
            width: 6,
            components: [
              {
                type: "select",
                key: "current_location",
                label: "Current Location",
                placeholder: "Select current location",
                input: true,
                data: {
                  values: [
                    { label: "Bangalore", value: "bangalore" },
                    { label: "Mumbai", value: "mumbai" },
                    { label: "Delhi NCR", value: "delhi" },
                    { label: "Hyderabad", value: "hyderabad" },
                    { label: "Pune", value: "pune" },
                    { label: "Chennai", value: "chennai" },
                    { label: "Other", value: "other" },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  },

  workExperience: {
    components: [
      {
        type: "columns",
        customClass: "my-2",
        columns: [
          {
            width: 6,
            components: [
              {
                type: "number",
                key: "total_experience_years",
                label: "Total Experience (Years)",
                placeholder: "e.g. 5",
                validate: { required: true, min: 0, max: 50 },
                input: true,
              },
            ],
          },
          {
            width: 6,
            components: [
              {
                type: "number",
                key: "total_experience_months",
                label: "Total Experience (Months)",
                placeholder: "e.g. 6",
                validate: { min: 0, max: 11 },
                input: true,
              },
            ],
          },
        ],
      },
      {
        type: "columns",
        customClass: "my-2",
        columns: [
          {
            width: 6,
            components: [
              {
                type: "textfield",
                key: "current_employer",
                label: "Current Employer",
                placeholder: "Company name",
                validate: { required: true },
                input: true,
              },
            ],
          },
          {
            width: 6,
            components: [
              {
                type: "textfield",
                key: "current_designation",
                label: "Current Designation",
                placeholder: "Your current role",
                validate: { required: true },
                input: true,
              },
            ],
          },
        ],
      },
      {
        type: "columns",
        customClass: "my-2",
        columns: [
          {
            width: 6,
            components: [
              {
                type: "datetime",
                key: "current_job_start_date",
                label: "Start Date (Current Job)",
                format: "yyyy-MM-dd",
                input: true,
                enableDate: true,
                enableTime: false,
              },
            ],
          },
          {
            width: 6,
            components: [
              {
                type: "textarea",
                key: "key_responsibilities",
                label: "Key Responsibilities",
                placeholder: "Describe your key responsibilities",
                rows: 3,
                input: true,
              },
            ],
          },
        ],
      },
    ],
  },

  education: {
    components: [
      {
        type: "columns",
        customClass: "my-2",
        columns: [
          {
            width: 6,
            components: [
              {
                type: "select",
                key: "highest_qualification",
                label: "Highest Qualification",
                placeholder: "Select",
                validate: { required: true },
                input: true,
                data: {
                  values: [
                    { label: "10th", value: "10th" },
                    { label: "12th", value: "12th" },
                    { label: "Diploma", value: "diploma" },
                    { label: "Graduate", value: "graduate" },
                    { label: "Post Graduate", value: "postgraduate" },
                    { label: "PhD / Doctorate", value: "phd" },
                  ],
                },
              },
            ],
          },
          {
            width: 6,
            components: [
              {
                type: "textfield",
                key: "course_name",
                label: "Course / Stream",
                placeholder: "e.g. B.Tech - Computer Science",
                validate: { required: true },
                input: true,
              },
            ],
          },
        ],
      },
      {
        type: "columns",
        customClass: "my-2",
        columns: [
          {
            width: 6,
            components: [
              {
                type: "textfield",
                key: "institute_name",
                label: "Institute / University",
                placeholder: "Name of the institution",
                validate: { required: true },
                input: true,
              },
            ],
          },
          {
            width: 6,
            components: [
              {
                type: "columns",
                columns: [
                  {
                    width: 6,
                    components: [
                      {
                        type: "number",
                        key: "year_of_passing",
                        label: "Year of Passing",
                        placeholder: "e.g. 2020",
                        validate: { required: true, min: 1950, max: 2030 },
                        input: true,
                      },
                    ],
                  },
                  {
                    width: 6,
                    components: [
                      {
                        type: "number",
                        key: "percentage_cgpa",
                        label: "% / CGPA",
                        placeholder: "e.g. 8.5",
                        input: true,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  socialSecurity: {
    components: [
      {
        type: "columns",
        customClass: "my-2",
        columns: [
          {
            width: 6,
            components: [
              {
                type: "textfield",
                key: "pan_number",
                label: "PAN Number",
                placeholder: "ABCDE1234F",
                validate: {
                  pattern: "^[A-Z]{5}[0-9]{4}[A-Z]{1}$",
                  customMessage: "Enter a valid PAN number",
                },
                input: true,
              },
            ],
          },
          {
            width: 6,
            components: [
              {
                type: "textfield",
                key: "aadhaar_number",
                label: "Aadhaar Number",
                placeholder: "XXXX XXXX XXXX",
                validate: {
                  minLength: 12,
                  maxLength: 14,
                },
                input: true,
              },
            ],
          },
        ],
      },
      {
        type: "columns",
        customClass: "my-2",
        columns: [
          {
            width: 6,
            components: [
              {
                type: "textfield",
                key: "uan_number",
                label: "UAN Number (PF)",
                placeholder: "Universal Account Number",
                input: true,
              },
            ],
          },
          {
            width: 6,
            components: [
              {
                type: "textfield",
                key: "passport_number",
                label: "Passport Number",
                placeholder: "A1234567",
                input: true,
              },
            ],
          },
        ],
      },
    ],
  },

  educationSection: {
    components: [
      {
        type: "textarea",
        key: "sop",
        label: "Statement of Purpose",
        placeholder: "Explain why you are applying for this role and how your experience makes you a great fit...",
        rows: 5,
        validate: { required: true },
        input: true,
      },
      {
        type: "columns",
        customClass: "my-2",
        columns: [
          {
            width: 6,
            components: [
              {
                type: "select",
                key: "available_from",
                label: "Available From (Notice Period)",
                placeholder: "Select",
                input: true,
                data: {
                  values: [
                    { label: "Immediately", value: "immediately" },
                    { label: "2 Weeks", value: "2_weeks" },
                    { label: "1 Month", value: "1_month" },
                    { label: "2 Months", value: "2_months" },
                    { label: "3 Months", value: "3_months" },
                    { label: "More than 3 Months", value: "more_3_months" },
                  ],
                },
              },
            ],
          },
          {
            width: 6,
            components: [
              {
                type: "checkbox",
                key: "willing_to_relocate",
                label: "Willing to Relocate?",
                input: true,
              },
            ],
          },
        ],
      },
      {
        type: "textarea",
        key: "additional_info",
        label: "Additional Information",
        placeholder: "Any other relevant information you'd like to share...",
        rows: 3,
        input: true,
      },
    ],
  },
};

export type IJPFormSchemaKeys = keyof typeof ijpApplicationSchemas;
