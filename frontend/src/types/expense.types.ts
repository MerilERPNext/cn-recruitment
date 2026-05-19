export type ExistingAttachment = {
  name: string;
  size: number;
  url: string;
  file_url?: string;
  fileDocName?: string;
  storage: "url";
  originalName?: string;
  type?: string;
};

export type AttachmentDocument = {
  name?: string;
  file_name?: string;
  file_url?: string;
};

export type ParticipantLike = {
  amount?: unknown;
  allocated_amount?: unknown;
  [key: string]: unknown;
};

export type OcrStatus = "idle" | "parsing" | "completed" | "failed";

export type OcrSummary = {
  amount: string;
  merchant: string;
  expense_date: string;
};
