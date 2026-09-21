export interface PayrollDocumentAttachment {
  file_url: string;
  attachment_url: string;
  file_name: string;
  is_private: 0 | 1;
  file?: string;
  file_size?: number;
}

export interface PayrollDocument {
  name: string;
  payroll_document_category: string;
  month: string;
  employee: string;
  employee_name: string;
  payroll_period: string;
  created_date: string | null;
  attach: string | null;
  company: string;
  creation: string;
  modified: string;
  attachment: PayrollDocumentAttachment | null;
  attachment_url: string | null;
}

export interface PayrollDocumentCategory {
  name: string;
  document_category: string;
}

export interface PayrollDocumentListResponse {
  status: string;
  total_count: number;
  start: number;
  page_length: number;
  data: PayrollDocument[];
}

export interface PayrollDocumentCategoriesResponse {
  status: string;
  total_count: number;
  data: PayrollDocumentCategory[];
}
