import { Employee } from "../../types/employee";

export interface JobType {
  name: string;
  job_title: string;
  status: string;
  posted_on: string;
  closes_on: string | null;
  description: string;
  opening_code: string | null;
  designation: string | null;
  designation_id: string | null;
  department: string | null;
  department_id: string | null;
  location: string | null;
  location_id: string | null;
  company: string | null;
  company_id: string | null;
}

export interface propsListViewComponents {
  onSelectJob: (job: JobType) => void;
  appliedIds: string[];
  currentEmployee: Employee | null;
}

export interface propsDetailViewComponents {
  job: JobType;
  appliedIds: string[];
  onBack: () => void;
  onApply: () => void;
}

export interface propscomponent {
  job: JobType;
  onCancel: () => void;
  onSubmitDone: (jobId: string) => void;
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  department: string;
  location: string;
  appliedDate: string;
  experience: string;
  sop: string;
  cvName: string;
  status: "Applied" | "Screening" | "Technical Round" | "Manager Round" | "Offered" | "Withdrawn";
}

export interface IJPTableField {
  fieldname: string;
  label: string;
  fieldtype: string;
  options: string;
  reqd: number;
  read_only: number;
  in_list_view: number;
  default: string | null;
}

export interface IJPField {
  section: string;
  reference_name: string;
  display_name: string;
  fieldtype: string;
  options: string;
  reqd: number;
  ctq: number;
  visibility: string;
  editability: string;
  table_fields?: IJPTableField[];
}

export type IJPApplicationValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>
  | Record<string, unknown>[]
  | unknown[];

export type IJPApplicationSubmitPayload = Record<string, IJPApplicationValue>;

export interface IJPApplicationSubmitResponse {
  message: {
    name: string;
    applicant_name: string;
    email_id: string;
    phone_number: string;
    status: string;
    [key: string]: unknown;
  };
}

export interface UseSubmitIJPApplicationVariables {
  opening: string;
  data: IJPApplicationSubmitPayload;
}

