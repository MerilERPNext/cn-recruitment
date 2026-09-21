import type { CSSProperties } from "react";
import { AlertCircle, PenLine, ZoomIn, ZoomOut } from "lucide-react";
import Button from "../shared/atoms/Button";
import type { PDFForm, PDFAnswers, PDFAnswer, PDFQuestion } from "../../types/pdfForms";
import { pdfFormsService, pdfTranslate as __ } from "../../services/pdfFormsService";

interface Props {
  form: PDFForm; answers: PDFAnswers; zoom: number;
  setZoom: (zoom: number) => void;
  onChange: (key: string, value: PDFAnswer) => void;
  onFocus: (key: string) => void;
  onSign: (q: PDFQuestion) => void;
}

export default function PDFDocument({ form, answers, zoom, setZoom, onChange, onFocus, onSign }: Props) {
  const disabled = (q: PDFQuestion) => form.mode !== "admin" && (!form.can_edit || !!q.read_only);
  return <section className="pdf-document-view" aria-label={__("PDF preview")}>
    <div className="flex items-center justify-between gap-3 border-b bg-white px-4 py-2 text-xs text-gray-500">
      <span>{__(form.mode === "admin" ? "Preview · sample answers are not submitted" : "Complete your answers on the PDF")}</span>
      <div className="flex items-center gap-2">
        <Button variant="subtle" onClick={() => setZoom(Math.max(65, zoom - 15))}><ZoomOut size={16} /><span className="sr-only">{__("Zoom out")}</span></Button>
        <span>{zoom}%</span>
        <Button variant="subtle" onClick={() => setZoom(Math.min(175, zoom + 15))}><ZoomIn size={16} /><span className="sr-only">{__("Zoom in")}</span></Button>
      </div>
    </div>
    <div className="pdf-page-scroll">
      {form.notes && <div className="mb-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800"><AlertCircle size={15} className="mt-0.5 shrink-0" />{form.notes}</div>}
      {form.pages.map((size, index) => <div key={index}>
        <p className="mb-2 text-center text-xs text-gray-500">{__("Page")} {index + 1} / {form.pages.length}</p>
        <div className="pdf-page-canvas" style={{ width: `${zoom}%`, maxWidth: `${850 * zoom / 100}px`, aspectRatio: `${size.width}/${size.height}` }}>
          <img src={pdfFormsService.pageUrl(form, index + 1)} alt={`${__("PDF page")} ${index + 1}`} loading={index ? "lazy" : "eager"} />
          {form.questions.filter(q => !q.exclude).flatMap(q => q.placements.filter(p => p.page === index + 1).map((p, offset) => {
            const [x0, y0, x1, y1] = p.rect;
            const style: CSSProperties = { left: `${x0 / size.width * 100}%`, top: `${y0 / size.height * 100}%`, width: `${(x1 - x0) / size.width * 100}%`, height: `${(y1 - y0) / size.height * 100}%` };
            if (p.rotation) {
              const vertical = p.rotation % 180 !== 0;
              const w = vertical ? y1 - y0 : x1 - x0, h = vertical ? x1 - x0 : y1 - y0;
              Object.assign(style, { left: `${((x0 + x1 - w) / 2) / size.width * 100}%`, top: `${((y0 + y1 - h) / 2) / size.height * 100}%`,
                width: `${w / size.width * 100}%`, height: `${h / size.height * 100}%`, transform: `rotate(${p.rotation}deg)` });
            }
            const common = { className: "pdf-answer-overlay", style, disabled: disabled(q), title: q.help_text || q.question,
              "data-pdf-question": q.field_key, onFocus: () => onFocus(q.field_key) };
            const key = `${q.field_key}-${offset}`;
            if (q.field_type === "Signature") return <button {...common} key={key} aria-label={q.question} onClick={() => onSign(q)}>
              {answers[q.field_key] ? <img src={String(answers[q.field_key])} alt={__("Signature")} /> : <span className="flex items-center justify-center gap-1"><PenLine size={10} />{__("Sign")}</span>}
            </button>;
            if (q.field_type === "Select") return <select {...common} key={key} aria-label={q.question} value={String(answers[q.field_key] ?? "")} onChange={e => onChange(q.field_key, e.target.value)}>
              <option value="">{__("Select…")}</option>{q.choices.map(choice => <option key={choice} value={choice}>{choice}</option>)}
            </select>;
            if (q.field_type === "Radio" || q.field_type === "Checkbox") return <input {...common} key={key} type={q.field_type === "Radio" ? "radio" : "checkbox"}
              aria-label={`${q.question}${q.field_type === "Radio" ? ` ${p.on_state}` : ""}`} name={`${q.field_key}-${index}`}
              checked={q.field_type === "Radio" ? answers[q.field_key] === p.on_state : !!answers[q.field_key]}
              onChange={e => onChange(q.field_key, q.field_type === "Radio" ? p.on_state || "" : e.target.checked)} />;
            const type = { Date: "date", Email: "email", Number: "number", Text: "text" }[q.field_type];
            return <input {...common} key={key} aria-label={q.question} type={type} value={String(answers[q.field_key] ?? "")}
              maxLength={q.max_length || undefined} min={q.min_value || undefined} max={q.max_value || undefined}
              onChange={e => onChange(q.field_key, e.target.value)} />;
          }))}
        </div>
      </div>)}
    </div>
  </section>;
}
