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
  singleAction: (fieldname: string, status: ApprovalStatus) => Promise<void>;
  bulkSelectedAction: (fieldnames: string[], status: ApprovalStatus) => Promise<void>;
  sectionAction: (sectionName: string, status: ApprovalStatus) => Promise<void>;
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