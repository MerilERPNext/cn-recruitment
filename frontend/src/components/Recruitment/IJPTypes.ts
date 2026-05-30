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

export interface propsResumeComponent {
  uploadedFile: string | null;
  onUpload: (fileName: string) => void;
  onNext: () => void;
}

export interface propsBiographicalStepComponent {
  onBack: () => void;
  onNext: () => void;
}

export interface propContactStep {
  onBack: () => void;
  onNext: () => void;
}

export interface propsAddressStepComponent {
  onBack: () => void;
  onNext: () => void;
}

export interface propWorkExperienceStepComponent {
  onBack: () => void;
  onNext: () => void;
}

export interface propsEducationStepComponent {
  onBack: () => void;
  onNext: () => void;
}

export interface propsLastSalaryStepComponent {
  onBack: () => void;
  onSubmit: () => void;
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

