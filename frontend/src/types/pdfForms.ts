export type PDFAnswer = string | number | boolean;
export type PDFAnswers = Record<string, PDFAnswer>;
export interface PDFQuestion {
  field_key: string;
  question_number?: number;
  question: string;
  pdf_name: string;
  pdf_type: string;
  field_type: "Text" | "Number" | "Email" | "Date" | "Checkbox" | "Select" | "Radio" | "Signature";
  placements: { page: number; rect: [number, number, number, number]; on_state?: string; rotation?: number }[];
  choices: string[];
  mandatory: number;
  read_only: number;
  exclude?: number;
  max_length?: number;
  min_value?: string | null;
  max_value?: string | null;
  value_source: "User Input" | "Record Field" | "Fixed Value";
  source_field?: string;
  source_doctype?: string;
  source_link_field?: string;
  default_value?: string;
  mandatory_when?: string;
  mandatory_value?: string;
  help_text?: string;
}
export interface PDFForm {
  name: string;
  title: string;
  status: string;
  mode: "admin" | "fill";
  modified?: string;
  revision?: number;
  reference_doctype?: string;
  can_edit?: boolean;
  assigned_to?: string;
  notes?: string;
  discovery_status?: "Queued" | "Processing" | "Ready" | "Failed";
  pages: { width: number; height: number }[];
  questions: PDFQuestion[];
  answers?: PDFAnswers;
  output_pdf?: string;
}
export interface PDFLibrary {
  is_admin: boolean;
  limits?: { max_bytes: number; max_pages: number };
  templates: { name: string; title: string; status: string; page_count: number }[];
  submissions: { name: string; form_title: string; assigned_to: string; status: string }[];
}
