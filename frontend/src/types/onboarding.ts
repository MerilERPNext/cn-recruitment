/* eslint-disable @typescript-eslint/no-explicit-any */
// ─── Approval Status ──────────────────────────────────────────────────────────

export type ApprovalStatus = "Pending" | "Approved" | "Rejected";

export type ToastType = "success" | "error" | "info";

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApprovalField {
  fieldname: string;
  label: string;
  fieldtype: string;
  section: string;
  section_fieldname: string;
  status: ApprovalStatus;
  current_value: string | any[] | null;
  reviewed_by: string | null;
  reviewed_on: string | null;
  child_doctype?: string;
  child_fields?: ChildField[];
}

export interface ChildField {
  fieldname: string;
  label: string;
  fieldtype: string;
}

export interface InitializeApprovalResponse {
  data: any;
  message: {
    status: string;
    message: string;
    data: ApprovalField[];
  };
}

export interface UpdateFieldPayload {
  onboarding_name: string;
  fieldname: string;
  new_status: ApprovalStatus;
}

export interface UpdateSectionPayload {
  onboarding_name: string;
  section_name: string;
  new_status: ApprovalStatus;
}

export interface BulkUpdatePayload {
  onboarding_name: string;
  new_status: ApprovalStatus;
}

// ─── Local UI State Types ─────────────────────────────────────────────────────

export interface FieldLocalState {
  status: ApprovalStatus;
  comment: string;
  showComment: boolean;
  loading: boolean;
}

export interface SectionEntry {
  section_fieldname: string;
  fields: ApprovalField[];
}

export interface ApiConfig {
  baseUrl: string;
  onboardingName: string;
  authToken: string;
}

export interface Toast {
  msg: string;
  type: ToastType;
}

// ─── Hook Return Types ────────────────────────────────────────────────────────

export interface UseApprovalDataReturn {
  allFields: ApprovalField[];
  sections: Record<string, SectionEntry>;
  fieldStates: Record<string, FieldLocalState>;
  pageLoading: boolean;
  pageError: string | null;
  loadData: () => Promise<void>;
  patchFieldState: (fieldname: string, patch: Partial<FieldLocalState>) => void;
  setFieldStates: React.Dispatch<React.SetStateAction<Record<string, FieldLocalState>>>;
}

export interface UseApprovalActionsReturn {
  singleAction: (
    fieldname: string,
    status: ApprovalStatus,
    comment?: string
  ) => Promise<void>;

  bulkSelectedAction: (
    fieldnames: string[],
    status: ApprovalStatus,
    comment?: string
  ) => Promise<void>;

  sectionAction: (
    sectionName: string,
    status: ApprovalStatus,
    comment?: string
  ) => Promise<void>;

  bulkApproveAllPending: () => Promise<void>;
}

export interface UseToastReturn {
  toast: Toast | null;
  showToast: (msg: string, type?: ToastType) => void;
}

export interface UseSectionNavReturn {
  activeSection: string | null;
  secKeys: string[];
  activeIdx: number;
  goToSection: (key: string) => void;
  goNext: () => void;
  goPrev: () => void;
}

export interface OnboardingPerson {
  user: string | null;
  employee: string | null;
  full_name: string;
  initials: string;
  email: string | null;
  image: string | null;
  designation: string | null;
  department: string | null;
  department_label: string | null;
  office_location: string | null;
  city: string | null;
  state: string | null;
  location_type: string | null;
  subtitle: string;
}

export interface OnboardingDocument {
  form: string;
  form_name: string;
  form_source: string;
  field_count: number;
  status: string;
  triggered_on: string | null;
  time_since_trigger_days: number | null;
  completion_date: string | null;
}

export interface EmployeeOnboardingDetail {
  name: string;
  boarding_status: string;
  job_applicant: string | null;
  employee: string | null;
  header: {
    employee_name: string | null;
    employee_id: string | null;
    designation: string | null;
    designation_label: string | null;
    department: string | null;
    department_label: string | null;
    company: string | null;
    company_label: string | null;
    phone: string | null;
    email: string | null;
    date_of_joining: string | null;
    boarding_begins_on: string | null;
    current_office_location: string | null;
    current_office_location_label: string | null;
  };
  manager: OnboardingPerson | null;
  key_people: {
    onboarding_spoc: OnboardingPerson | null;
    recruiter: OnboardingPerson | null;
    buddies: OnboardingPerson[];
    teammates: OnboardingPerson[];
    notify_users: OnboardingPerson[];
  };
  onboarding_documents: OnboardingDocument[];
  workflow_tasks: any[];
  verification_reports: any[];
}

export interface EmployeeOnboardingDetailResponse {
  success: boolean;
  message: string;
  data: EmployeeOnboardingDetail;
}