export interface NewHireField {
  fieldname: string;
  label: string;
  fieldtype: string;
  options: string;
  is_mandatory: number;
  read_only: number;
  depends_on?: string;
  mandatory_depends_on?: string;
  default?: string;
  length?: number;
  description?: string;
  order?: number;
  value?: unknown;
  child_doctype?: string;
  child_fields?: unknown[];
}

export interface NewHireSection {
  section: string;
  fields: NewHireField[];
}

export interface NewHireTab {
  tab: string;
  sections: NewHireSection[];
}

export interface NewHireFormConfigData {
  doctype: string;
  form: string;
  restrict_to_configured: number;
  basis_employment_type: number;
  employment_type: string | null;
  tabs: NewHireTab[];
}

export interface NewHireFormConfigResponse {
  success: boolean;
  message: string;
  data: NewHireFormConfigData;
}

export interface CreateNewHireResponse {
  success: boolean;
  message: string;
  data: {
    name: string;
    status: string;
    stage: string;
    form: string;
    [key: string]: unknown;
  };
}

export interface NewHireRow {
  name: string;
  employee_name: string;
  designation?: string;
  department?: string;
  company?: string;
  employment_type?: string;
  date_of_joining?: string;
  custom_new_hire_stage?: string;
  status?: string;
  can_initiate_onboarding?: boolean;
  [key: string]: unknown;
}

export interface NewHireColumn {
  fieldname: string;
  label: string;
  value_key: string;
}

export interface NewHireListResponse {
  success: boolean;
  message: string;
  data: {
    columns: NewHireColumn[];
    rows: NewHireRow[];
    total: number;
    start: number;
    page_length: number;
  };
}

export interface NewHireDetailResponse {
  success: boolean;
  message: string;
  data: NewHireRow & {
    custom_new_hire_form?: string;
    personal_email?: string;
    company_email?: string;
    cell_number?: string;
    gender?: string;
    date_of_birth?: string;
    grade?: string;
    branch?: string;
    reports_to?: string;
    ctc?: number | string;
    [key: string]: unknown;
  };
}

export interface InitiateOnboardingResponse {
  success: boolean;
  message: string;
  data: {
    name: string;
    stage: string;
    job_applicant?: string;
    employee_onboarding?: string;
    already_initiated?: boolean;
  };
}

export interface ActivateEmployeeResponse {
  success: boolean;
  message: string;
  data: {
    name: string;
    previous_name?: string | null;
    status: string;
    renamed: boolean;
  };
}

export interface UpdateNewHireResponse {
  success: boolean;
  message: string;
  data: {
    name: string;
    status: string;
    stage: string;
    [key: string]: unknown;
  };
}
