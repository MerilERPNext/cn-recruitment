import { cloneElement, isValidElement, useEffect, useId, useState, type ReactElement, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import SideDrawer from "../shared/SideDrawer";
import PDFLinkField from "./PDFLinkField";
import Button from "../shared/atoms/Button";
import type { PDFForm, PDFQuestion } from "../../types/pdfForms";
import { pdfFormsService, pdfTranslate as __ } from "../../services/pdfFormsService";

export function PDFField({ label, children, help }: { label: string; children: ReactNode; help?: string }) {
  const id = useId();
  return <div className="block mb-4"><label htmlFor={id} className="mb-1.5 block text-xs font-medium text-gray-700">{__(label)}</label>{isValidElement(children) ? cloneElement(children as ReactElement<{id?: string}>, { id }) : children}{help && <span className="mt-1.5 block text-xs leading-relaxed text-gray-500">{__(help)}</span>}</div>;
}
export const controlClass = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10";

export default function PDFQuestionSettings({ question, form, onClose, onSave }: { question: PDFQuestion; form: PDFForm; onClose: () => void; onSave: (q: PDFQuestion) => void }) {
  const [draft, setDraft] = useState({ ...question });
  const update = (values: Partial<PDFQuestion>) => setDraft(old => ({ ...old, ...values }));
  const referenceDoctype = form.reference_doctype?.trim() || "";
  const sourceDoctype = draft.source_doctype?.trim() || referenceDoctype;
  const hasExternalSource = !!referenceDoctype && !!sourceDoctype && sourceDoctype !== referenceDoctype;
  const fields = useQuery({ queryKey: ["pdf-mapping-fields", sourceDoctype], enabled: !!sourceDoctype,
    queryFn: () => pdfFormsService.fields(sourceDoctype), staleTime: 300000 });
  const links = useQuery({ queryKey: ["pdf-mapping-fields", referenceDoctype], enabled: !!referenceDoctype,
    queryFn: () => pdfFormsService.fields(referenceDoctype), staleTime: 300000 });
  useEffect(() => { const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, [onClose]);
  return <SideDrawer open onClose={onClose} side="right" size="xl" title={`${__("Configure")} ${question.question}`} className="p-0">
    <form className="flex min-h-full flex-col" onSubmit={e => { e.preventDefault(); onSave(draft); }}>
      <div className="flex-1 p-5" role="dialog" aria-label={`${__("Configure")} ${question.question}`}>
        <p className="mb-3 text-xs text-gray-500">Q{form.questions.findIndex(q => q.field_key === question.field_key) + 1} · {__("Page")} {question.placements[0].page}</p>
        <p className="mb-5 rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-500">{__("Question labels and positions are taken from the uploaded PDF and cannot be edited.")}</p>
        <label className="mb-5 flex items-center gap-2 text-sm"><input type="checkbox" checked={!!draft.exclude} onChange={e => update({ exclude: +e.target.checked })} />{__("Exclude this question from assigned forms")}</label>
        <fieldset disabled={!!draft.exclude} className="disabled:opacity-50">
        <PDFField label="Answer type"><select className={controlClass} value={draft.field_type} onChange={e => update({ field_type: e.target.value as PDFQuestion["field_type"] })}>
          {(["Layout", "OCR"].includes(draft.pdf_type) ? ["Text", "Number", "Email", "Date", "Signature", "Checkbox"] : draft.pdf_type === "Text" ? ["Text", "Number", "Email", "Date"] : [draft.field_type]).map(type => <option key={type}>{type}</option>)}
        </select></PDFField>
        <label className="mb-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={!!draft.mandatory} onChange={e => update({ mandatory: +e.target.checked })} />{__("Make field mandatory")}</label>
        <label className="mb-5 flex items-center gap-2 text-sm"><input type="checkbox" checked={!!draft.read_only} onChange={e => update({ read_only: +e.target.checked })} />{__("Disable field editing for the user")}</label>
        <PDFField label="Value source"><select className={controlClass} value={draft.value_source} onChange={e => update({ value_source: e.target.value as PDFQuestion["value_source"] })}>
          {["User Input", "Record Field", "Fixed Value"].map(value => <option key={value}>{value}</option>)}
        </select></PDFField>
        {draft.value_source === "Record Field" ? <>
        {!referenceDoctype ? <p role="alert" className="mb-4 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">{__("Set a Reference DocType in Template settings before choosing a Record Field.")}</p> : <>
          <PDFField label="Source DocType" help={__("Defaults to the template Reference DocType. Choose another DocType only when the reference record links to it.")}><PDFLinkField doctype="DocType" value={sourceDoctype} onChange={value => update({ source_doctype: value, source_field: "", source_link_field: "" })} /></PDFField>
          {hasExternalSource && <PDFField label="Link from reference record"><select required className={controlClass} value={draft.source_link_field || ""} onChange={e => update({ source_link_field: e.target.value })}>
            <option value="">{__("Select a linking field")}</option>{links.data?.filter(f => f.fieldtype === "Link" && f.options === sourceDoctype).map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select></PDFField>}
          <PDFField label="Linked record field" help={`${__("Prefilled from")} ${sourceDoctype}`}>
            <select required className={controlClass} value={draft.source_field || ""} onChange={e => update({ source_field: e.target.value })}>
              <option value="">{__("Select a field")}</option>{fields.data?.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </PDFField>
        </>}</> : <PDFField label="Default / fixed value">{draft.field_type === "Checkbox" ? <select className={controlClass} value={["1", "Yes", "true"].includes(draft.default_value || "") || draft.choices.includes(draft.default_value || "") ? "true" : ""} onChange={e => update({ default_value: e.target.value })}><option value="">{__("Unchecked")}</option><option value="true">{__("Checked")}</option></select>
          : draft.choices.length ? <select className={controlClass} value={draft.default_value || ""} onChange={e => update({ default_value: e.target.value })}><option value="">{__("No default")}</option>{draft.choices.map(choice => <option key={choice}>{choice}</option>)}</select>
          : <input className={controlClass} type={draft.field_type === "Date" ? "date" : draft.field_type === "Number" ? "number" : draft.field_type === "Email" ? "email" : "text"} value={draft.default_value || ""} onChange={e => update({ default_value: e.target.value })} />}</PDFField>}
        {draft.choices.length > 0 && <PDFField label="Choices from PDF"><p className="text-sm text-gray-600">{draft.choices.join(" · ")}</p></PDFField>}
        {draft.field_type === "Text" && <PDFField label="Maximum characters"><input className={controlClass} type="number" min="0" max="10000" value={draft.max_length || ""} onChange={e => update({ max_length: Number(e.target.value) })} /></PDFField>}
        {draft.field_type === "Number" && <div className="grid grid-cols-2 gap-3"><PDFField label="Minimum value"><input className={controlClass} type="number" value={draft.min_value || ""} onChange={e => update({ min_value: e.target.value })} /></PDFField><PDFField label="Maximum value"><input className={controlClass} type="number" value={draft.max_value || ""} onChange={e => update({ max_value: e.target.value })} /></PDFField></div>}
        <PDFField label="Mandatory when another answer…"><select className={controlClass} value={draft.mandatory_when || ""} onChange={e => update({ mandatory_when: e.target.value })}>
          <option value="">{__("No condition")}</option>{form.questions.map((q, index) => ({ q, index })).filter(({q}) => q.field_key !== draft.field_key && !q.exclude).map(({q, index}) => <option key={q.field_key} value={q.field_key}>Q{index + 1} · {q.question} · {__("Page")} {q.placements[0].page}</option>)}
        </select></PDFField>
        {draft.mandatory_when && <PDFField label="…equals this value"><input className={controlClass} value={draft.mandatory_value || ""} onChange={e => update({ mandatory_value: e.target.value })} /></PDFField>}
        <PDFField label="Help text"><textarea className={controlClass} rows={2} value={draft.help_text || ""} onChange={e => update({ help_text: e.target.value })} /></PDFField>
        </fieldset>
      </div>
      <footer className="sticky bottom-0 flex justify-end gap-2 border-t bg-white p-4"><Button variant="outline" onClick={onClose}>{__("Cancel")}</Button><Button type="submit">{__("Apply settings")}</Button></footer>
    </form>
  </SideDrawer>;
}
