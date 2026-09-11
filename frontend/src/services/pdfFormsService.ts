import FrappeAPI from "../utils/frappeAPI";
import type { PDFForm, PDFLibrary, PDFAnswers } from "../types/pdfForms";

const call = <T,>(method: string, args: Record<string, unknown> = {}) =>
  FrappeAPI.callMethod(`nextai.pdf_forms.api.${method}`, args, { skipTargetEmployee: true }) as Promise<T>;

export const PDF_FORMS_ROUTE = "/webapp/pdf-form-template";
export const PDF_SUBMISSION_ROUTE = "/webapp/pdf-form-submission";
export const pdfFormsService = {
  list: () => call<PDFLibrary>("list_forms"),
  get: (name: string, admin: boolean) => call<PDFForm>(admin ? "get_template" : "get_form", { name }),
  upload: async (file: File, title: string, reference_doctype: string) => {
    if (!(await file.slice(0, 5).text()).startsWith("%PDF-")) throw new Error(pdfTranslate("Choose a valid PDF document. Renaming another file to .pdf does not convert it."));
    const uploaded = await FrappeAPI.uploadFile(file).catch(error => {
      const message = JSON.stringify(error?.response?.data || error?.message || "");
      if (/decrypt|encrypt|password.protected/i.test(message)) throw new Error(pdfTranslate("This PDF is password protected. Upload an unlocked copy."));
      if (/stream has ended|eof|startxref|pdfreaderror/i.test(message)) throw new Error(pdfTranslate("This PDF is damaged or incomplete. Export a new PDF and try again."));
      throw error;
    });
    return call<PDFForm>("create_template", { title, reference_doctype: reference_doctype || null, file_url: uploaded.file_url });
  },
  save: (form: PDFForm, answers: PDFAnswers, final = false) => form.mode === "admin"
    ? call<PDFForm>("save_template", { name: form.name, title: form.title, reference_doctype: form.reference_doctype || "", questions: form.questions, modified: form.modified, publish: final })
    : call<PDFForm>("save_answers", { name: form.name, answers, revision: form.revision, submit: final }),
  fields: (doctype: string) => call<{ value: string; label: string; fieldtype: string; options?: string }[]>("mapping_fields", { doctype }),
  linkOptions: async (doctype: string, text = "") => {
    const results = await call<{ value: string; label?: string }[]>("link_options", { doctype, text });
    return results.map(item => ({ value: item.value, label: item.label || item.value }));
  },
  duplicate: (name: string) => call<PDFForm>("duplicate_template", { name }),
  retryDiscovery: (name: string) => call<PDFForm>("retry_discovery", { name }),
  assign: (template: string, assigned_to: string, reference_name: string) => call<{ name: string; url: string }>("assign_form", { template, assigned_to, reference_name: reference_name || null }),
  pageUrl: (form: PDFForm, page: number) => `/api/method/nextai.pdf_forms.api.page_image?${new URLSearchParams({ page: String(page), [form.mode === "admin" ? "template" : "submission"]: form.name })}`,
};

export const isPDFRequired = (q: PDFForm["questions"][number], answers: PDFAnswers) =>
  !!q.mandatory || !!(q.mandatory_when && String(answers[q.mandatory_when] ?? "") === String(q.mandatory_value || ""));

export const pdfTranslate = (message: string) => {
  const win = window as Window & { __?: (value: string) => string };
  return win.__ ? win.__(message) : message;
};
