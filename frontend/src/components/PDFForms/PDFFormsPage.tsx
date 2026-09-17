import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Download, FileText, Search, Settings2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import HeaderBar from "../HeaderBar";
import SideDrawer from "../shared/SideDrawer";
import ActionConfirmationModal from "../shared/ActionConfirmationModal";
import Button from "../shared/atoms/Button";
import { Typography } from "../shared/atoms/Typography";
import { useScreenSize } from "../../hooks/useScreenSize";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import { isPDFRequired, pdfFormsService as service, pdfTranslate as __, PDF_FORMS_ROUTE, PDF_SUBMISSION_ROUTE } from "../../services/pdfFormsService";
import type { PDFAnswers, PDFForm, PDFQuestion } from "../../types/pdfForms";
import PDFDocument from "./PDFDocument";
import PDFLinkField from "./PDFLinkField";
import PDFQuestionSettings, { controlClass, PDFField } from "./PDFQuestionSettings";
import "./PDFForms.css";

type Panel = "upload" | "assign" | "template" | "signature" | "publish" | "submit" | null;

export default function PDFFormsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const { isDesktop } = useScreenSize();
  const name = params.get("template") || params.get("name");
  const admin = !!params.get("template");
  const library = useQuery({ queryKey: ["pdf-forms-library"], queryFn: service.list, refetchOnWindowFocus: false });
  const queryKey = ["pdf-form", name, admin];
  const loaded = useQuery({ queryKey, queryFn: () => service.get(name!, admin), enabled: !!name, refetchOnWindowFocus: false, staleTime: Infinity,
    refetchInterval: query => ["Queued", "Processing"].includes(query.state.data?.discovery_status || "") ? 1500 : false });
  const [form, setForm] = useState<PDFForm | null>(null);
  const [answers, setAnswers] = useState<PDFAnswers>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const allowLeave = useRef(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  const [zoom, setZoom] = useState(100);
  const [question, setQuestion] = useState<PDFQuestion | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [title, setTitle] = useState("");
  const [reference, setReference] = useState("");
  const [recipient, setRecipient] = useState("");
  const [record, setRecord] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [signatureQuestion, setSignatureQuestion] = useState<PDFQuestion | null>(null);
  const [typedName, setTypedName] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false), marked = useRef(false);
  const workspace = useRef<HTMLDivElement>(null);
  const discovering = admin && ["Queued", "Processing"].includes(form?.discovery_status || "");
  const editable = !!form && (admin ? form.status === "Draft" && form.discovery_status === "Ready" : !!form.can_edit);
  const questionNumbers = useMemo(() => new Map(form?.questions.map((q, index) => [q.field_key, q.question_number || index + 1]) || []), [form?.questions]);
  const maxUploadBytes = library.data?.limits?.max_bytes || 20 * 1024 * 1024;
  const templates = params.get("view") === "templates" || (!params.get("view") && !!library.data?.is_admin);

  useEffect(() => {
    if (!loaded.data) return;
    setForm(loaded.data);
    setAnswers(loaded.data.mode === "fill" ? { ...loaded.data.answers } : Object.fromEntries(loaded.data.questions.map(q => [q.field_key, q.field_type === "Checkbox" ? false : q.default_value || ""])));
    setDirty(false); setSearch("");
  }, [loaded.data]);

  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => { if (dirty && !allowLeave.current) { event.preventDefault(); event.returnValue = ""; } };
    const nav = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest("a[href]");
      if (dirty && link && !link.hasAttribute("download") && link.getAttribute("target") !== "_blank") {
        event.preventDefault(); event.stopPropagation();
        setLeaveTo((link as HTMLAnchorElement).href);
      }
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", nav, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", nav, true); };
  }, [dirty]);

  function go(values: Record<string, string>) {
    const path = values.name || !library.data?.is_admin ? PDF_SUBMISSION_ROUTE : PDF_FORMS_ROUTE;
    const target = `${path}?${new URLSearchParams(values)}`;
    if (dirty) { setLeaveTo(target); return; }
    changeRoute(target);
  }
  function changeRoute(target: string) {
    setDirty(false); setForm(null); setLeaveTo(null);
    const url = new URL(target, window.location.href);
    if (url.origin === window.location.origin && url.pathname.startsWith("/webapp")) navigate(url.pathname + url.search + url.hash);
    else { allowLeave.current = true; window.location.assign(url.href); }
  }
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try { await action(); } catch (error) { toast.error(errorResponseFormater(error)); } finally { setBusy(false); }
  }
  async function save(final = false) {
    if (!form) return;
    await run(async () => {
      const result = await service.save(form, answers, final);
      cache.setQueryData(queryKey, result); setDirty(false); setPanel(null);
      await cache.invalidateQueries({ queryKey: ["pdf-forms-library"] });
      if (final && !admin) {
        await Promise.all([
          cache.invalidateQueries({ queryKey: ["employee-flow-requests"] }),
          cache.invalidateQueries({ queryKey: ["employee-flow-request-details"] }),
        ]);
      }
      toast.success(__(final ? "Completed successfully." : "Draft saved."));
    });
  }
  function focus(q: PDFQuestion) {
    setSelected(q.field_key);
    const node = workspace.current?.querySelector<HTMLElement>(`[data-pdf-question="${q.field_key}"]`);
    node?.scrollIntoView({ block: "center", behavior: "smooth" }); node?.focus({ preventScroll: true });
  }
  function openPanel(next: Panel) {
    if (next === "template" && form) { setTitle(form.title); setReference(form.reference_doctype || ""); }
    if (next === "upload") { setTitle(""); setReference(""); setFile(null); }
    setPanel(next);
  }
  async function panelSubmit() {
    if (panel === "publish" || panel === "submit") return save(true);
    if (panel === "template" && form) { setForm({ ...form, title, reference_doctype: reference }); setDirty(true); setPanel(null); return; }
    if (panel === "signature" && signatureQuestion && canvas.current) {
      const context = canvas.current.getContext("2d")!;
      if (typedName.trim()) {
        context.clearRect(0, 0, 900, 320); context.font = "italic 58px Georgia"; context.fillStyle = "#172033";
        context.fillText(typedName.trim().slice(0, 100), 25, 185, 850); marked.current = true;
      }
      if (!marked.current) { toast.error(__("Draw a signature or type your name.")); return; }
      setAnswers(old => ({ ...old, [signatureQuestion.field_key]: canvas.current!.toDataURL("image/png") }));
      if (!admin) setDirty(true); setPanel(null); return;
    }
    await run(async () => {
      if (panel === "upload") {
        if (!file || !title.trim()) throw new Error(__("Choose a PDF and enter a title."));
        if (file.size > maxUploadBytes) throw new Error(__("PDF files must be {0} MB or smaller.").replace("{0}", String(maxUploadBytes / 1024 / 1024)));
        const result = await service.upload(file, title.trim(), reference.trim());
        setPanel(null); go({ template: result.name }); await cache.invalidateQueries({ queryKey: ["pdf-forms-library"] });
      } else if (panel === "assign" && form) {
        const result = await service.assign(form.name, recipient.trim(), record.trim());
        setPanel(null); await cache.invalidateQueries({ queryKey: ["pdf-forms-library"] });
        toast.success(<span>{__("Form assigned.")} <Link to={`${PDF_SUBMISSION_ROUTE}?name=${encodeURIComponent(result.name)}`} className="underline">{__("Open form")}</Link></span>);
      }
    });
  }
  const panelTitle: Record<NonNullable<Panel>, string> = { upload: "Upload PDF", assign: "Assign PDF form", template: "Template settings", signature: "Signature", publish: "Submit PDF template", submit: "Submit PDF form" };
  const panelAction: Record<NonNullable<Panel>, string> = { upload: "Discover questions", assign: "Assign form", template: "Apply settings", signature: "Use signature", publish: "Submit template", submit: "Submit PDF" };
  const error = loaded.error || library.error;

  return <DesktopLayoutWrapper title={__(form?.mode === "fill" ? "PDF Form Submission" : "PDF Form Template")}>
    {!isDesktop && <HeaderBar title={__(form?.mode === "fill" ? "PDF Form Submission" : "PDF Form Template")} onBack={() => go({})} />}
    <div className="pdf-forms-module" ref={workspace}>
      <ActionConfirmationModal isOpen={!!leaveTo} title={__("Discard unsaved changes?")} message={__("Your last saved draft will be kept. Changes made since then will be discarded.")}
        confirmLabel={__("Discard changes")} cancelLabel={__("Keep editing")} confirmBgColor="warning" onCancel={() => setLeaveTo(null)} onConfirm={() => leaveTo && changeRoute(leaveTo)} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {name ? <Button variant="subtle" onClick={() => go({ view: admin ? "templates" : "assigned" })}><ArrowLeft size={16} /><span className="sr-only">{__("Back to PDF forms")}</span></Button>
            : <Link to="/webapp" className="text-gray-500"><ArrowLeft size={18} /><span className="sr-only">{__("Back to app")}</span></Link>}
          <div className="min-w-0"><Typography variant="h4" className="break-words">{name && form ? form.title : __("PDF Form Template")}</Typography>
            <p className="mt-0.5 text-xs text-gray-500">{name ? (admin ? __("Configure questions and preview the original PDF") : __("Complete the form assigned to you")) : __("Build reusable PDF forms for your workflows")}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {form && name && <><span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs text-primary">{__(form.status)}</span><span className="hidden text-xs text-gray-500 lg:block">{__(dirty ? "Unsaved changes" : "All changes saved")}</span></>}
          {!name && library.data?.is_admin && <Button icon={<Upload size={15} />} onClick={() => openPanel("upload")}>{__("Upload PDF")}</Button>}
          {name && form && admin && editable && <Button variant="subtle" onClick={() => openPanel("template")}><Settings2 size={16} /><span className="sr-only">{__("Template settings")}</span></Button>}
          {name && form && editable && <Button variant="outline" loading={busy} onClick={() => save()}>{__("Save draft")}</Button>}
          {name && form && editable && <Button disabled={busy || !form.questions.length} onClick={() => {
            if (!admin) { const missing = form.questions.find(q => isPDFRequired(q, answers) && !answers[q.field_key] && answers[q.field_key] !== 0); if (missing) { focus(missing); toast.error(`${missing.question}: ${__("This field is required.")}`); return; } }
            openPanel(admin ? "publish" : "submit");
          }}>{__(admin ? "Submit template" : "Submit PDF")}</Button>}
          {name && form && admin && form.status === "Submitted" && <><Button variant="outline" disabled={busy} onClick={() => run(async () => { const result = await service.duplicate(form.name); go({ template: result.name }); })}>{__("Duplicate")}</Button><Button onClick={() => openPanel("assign")}>{__("Assign form")}</Button></>}
          {name && form?.output_pdf && <a className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs text-white" href={form.output_pdf} target="_blank" rel="noopener noreferrer"><Download size={15} />{__("Completed PDF")}</a>}
        </div>
      </div>
      {error ? <div className="p-8 text-sm text-error" role="alert">{errorResponseFormater(error)}<Button variant="outline" onClick={() => name ? loaded.refetch() : library.refetch()}>{__("Retry")}</Button></div>
        : (name && (!form || loaded.isLoading)) || (!name && library.isLoading) ? <div className="p-10 text-sm text-gray-500" role="status">{__("Loading PDF forms…")}</div>
        : !name ? <div className="overflow-auto p-4 md:p-6">
          <div className="mb-5 flex gap-2"><Button variant={!templates ? "soft" : "subtle"} onClick={() => go({ view: "assigned" })}>{__("Assigned forms")}</Button>{library.data?.is_admin && <Button variant={templates ? "soft" : "subtle"} onClick={() => go({ view: "templates" })}>{__("Form templates")}</Button>}</div>
          <p className="mb-5 max-w-2xl text-sm leading-relaxed text-gray-500">{__(templates ? "Upload a PDF to discover its questions, including regular documents and scans. Review field rules, submit the template, and select it in a Chatnext workflow stage." : "Save a draft while you work. Submitting locks your answers and produces a completed PDF.")}</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {templates ? library.data?.templates.map(item => <article key={item.name} className="rounded-xl border bg-white p-5 shadow-sm"><FileText className="mb-3 text-primary" size={22} /><Typography variant="subheading" className="block break-words">{item.title}</Typography><p className="my-3 text-xs text-gray-500">{__(item.status)} · {item.page_count} {__("pages")}</p><Button variant="outline" onClick={() => go({ template: item.name })}>{__("Open builder")}</Button></article>)
              : library.data?.submissions.map(item => <article key={item.name} className="rounded-xl border bg-white p-5 shadow-sm"><FileText className="mb-3 text-primary" size={22} /><Typography variant="subheading" className="block break-words">{item.form_title}</Typography><p className="my-3 text-xs text-gray-500">{__(item.status)} · {item.assigned_to}</p><Button variant="outline" onClick={() => go({ name: item.name })}>{__("Open form")}</Button></article>)}
            {(templates ? !library.data?.templates.length : !library.data?.submissions.length) && <div className="col-span-full rounded-xl border border-dashed bg-white p-12 text-center text-sm text-gray-500">{__(templates ? "No PDF templates yet. Upload a fillable PDF to get started." : "No PDF forms are assigned to you.")}</div>}
          </div>
        </div> : discovering ? <div className="p-8 text-sm text-gray-600" role="status">{__("Discovering questions… Scanned pages may take longer. You can leave this page and return when processing finishes.")}</div>
        : form?.discovery_status === "Failed" ? <div className="p-8 text-sm text-error" role="alert"><p className="mb-4">{form.notes}</p><Button onClick={() => run(async () => { const result = await service.retryDiscovery(form.name); cache.setQueryData(queryKey, result); })}>{__("Retry discovery")}</Button></div>
        : form && <div className="pdf-forms-workspace">
          <aside className="pdf-question-panel" aria-label={__("Questions")}>
            <div className="border-b p-4"><Typography variant="label" className="mb-3 block uppercase">{form.questions.length} {__("questions")}</Typography>
              <p className="pdf-question-intro mb-3 rounded-lg bg-primary-50 p-3 text-xs leading-relaxed text-gray-600">{__(!form.questions.length ? "No answer areas were detected in this document. The original PDF is available for review." : admin ? "Questions are discovered from the PDF. Configure their settings without changing the labels or layout." : "Choose a question to jump to its field in the PDF.")}</p>
              <div className="relative"><Search size={14} className="absolute left-2.5 top-3 text-gray-400" /><input aria-label={__("Search questions")} placeholder={__("Search questions")} type="search" className={`${controlClass} pl-8`} value={search} onChange={e => setSearch(e.target.value)} /></div>
            </div>
            <div className="pdf-question-rows">{form.questions.filter(q => q.question.toLowerCase().includes(search.toLowerCase())).map(q => <div key={q.field_key} className={`mb-2 flex items-center gap-2 rounded-lg border p-3 ${selected === q.field_key ? "border-primary-300 bg-primary-50" : "bg-white"}`}>
              <button type="button" onClick={() => focus(q)} className={`min-w-0 flex-1 text-left ${q.exclude ? "opacity-50" : ""}`}><span className="block break-words text-xs font-medium leading-relaxed">{q.question}{!q.exclude && isPDFRequired(q, answers) && <span className="ml-1 text-error">*</span>}</span><span className="mt-1 block text-[10px] text-gray-500">Q{questionNumbers.get(q.field_key)} · {__(q.field_type)} · {__("Page")} {q.placements[0].page}{q.exclude ? ` · ${__("Excluded")}` : q.read_only ? ` · ${__("Read only")}` : ""}</span></button>
              {admin ? <button type="button" disabled={!editable} aria-label={`${__("Configure")} ${q.question}`} className="rounded-md p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40" onClick={() => setQuestion(q)}><Settings2 size={15} /></button> : !!answers[q.field_key] && <Check size={14} className="text-success" />}
            </div>)}</div>
          </aside>
          <PDFDocument form={form} answers={answers} zoom={zoom} setZoom={setZoom} onFocus={setSelected}
            onChange={(key, value) => { setAnswers(old => ({ ...old, [key]: value })); if (!admin) setDirty(true); }}
            onSign={q => { setSignatureQuestion(q); setTypedName(""); marked.current = false; openPanel("signature"); }} />
        </div>}
      {question && form && <PDFQuestionSettings question={question} form={form} onClose={() => setQuestion(null)} onSave={q => { setForm({ ...form, questions: form.questions.map(old => old.field_key === q.field_key ? q : old) }); setDirty(true); setQuestion(null); }} />}
      {panel && <SideDrawer open onClose={() => { if (!busy) setPanel(null); }} size="xl" title={__(panelTitle[panel])} className="p-0">
        <form className="flex min-h-full flex-col" onSubmit={e => { e.preventDefault(); void panelSubmit(); }}>
          <div className="flex-1 p-5" role="dialog" aria-label={__(panelTitle[panel])}>
            {(panel === "upload" || panel === "template") && <>
              {panel === "upload" && <PDFField label="PDF document" help={__("PDF documents and scans, up to {0} MB and 30 pages. Questions are discovered automatically for your review.").replace("{0}", String(maxUploadBytes / 1024 / 1024))}><input required type="file" accept=".pdf,application/pdf" className={controlClass} onChange={e => { const chosen = e.target.files?.[0] || null; setFile(chosen); if (chosen && !title) setTitle(chosen.name.replace(/\.pdf$/i, "")); }} /></PDFField>}
              <PDFField label="Template title"><input required className={controlClass} value={title} onChange={e => setTitle(e.target.value)} /></PDFField>
              <PDFField label="Reference DocType (optional)" help="The record type used to prefill mapped fields, such as Employee."><PDFLinkField doctype="DocType" value={reference} onChange={setReference} /></PDFField>
            </>}
            {panel === "assign" && <><PDFField label="Assign to user"><PDFLinkField doctype="User" value={recipient} onChange={setRecipient} /></PDFField>{form?.reference_doctype && <PDFField label={`${form.reference_doctype} record`}><PDFLinkField doctype={form.reference_doctype} value={record} onChange={setRecord} /></PDFField>}</>}
            {panel === "publish" && <p className="text-sm leading-relaxed text-gray-600">{__("Submitting freezes the questions and field rules and makes this template available to workflows. Duplicate it to create a new version.")}</p>}
            {panel === "submit" && <p className="text-sm leading-relaxed text-gray-600">{__("Your answers will be saved in a completed PDF and cannot be changed after submission.")}</p>}
            {panel === "signature" && <>
              <p className="mb-4 text-xs leading-relaxed text-gray-500">{__("Draw or type a signature. This records acknowledgement; it is not a certificate-based digital signature.")}</p>
              <canvas ref={canvas} width={900} height={320} className="pdf-signature-canvas" aria-label={__("Draw your signature")}
                onPointerDown={e => { drawing.current = true; e.currentTarget.setPointerCapture(e.pointerId); const r = e.currentTarget.getBoundingClientRect(), c = e.currentTarget.getContext("2d")!; c.strokeStyle = "#172033"; c.lineWidth = 3; c.lineCap = "round"; c.beginPath(); c.moveTo((e.clientX - r.left) * 900 / r.width, (e.clientY - r.top) * 320 / r.height); }}
                onPointerMove={e => { if (!drawing.current) return; marked.current = true; const r = e.currentTarget.getBoundingClientRect(), c = e.currentTarget.getContext("2d")!; c.lineTo((e.clientX - r.left) * 900 / r.width, (e.clientY - r.top) * 320 / r.height); c.stroke(); }} onPointerUp={() => drawing.current = false} onPointerCancel={() => drawing.current = false} />
              <div className="my-4 flex gap-2"><Button variant="subtle" onClick={() => { canvas.current?.getContext("2d")?.clearRect(0, 0, 900, 320); marked.current = false; setTypedName(""); }}>{__("Clear drawing")}</Button>
                {signatureQuestion && answers[signatureQuestion.field_key] && <Button variant="subtle" onClick={() => { setAnswers(old => ({ ...old, [signatureQuestion.field_key]: "" })); if (!admin) setDirty(true); setPanel(null); }}>{__("Remove signature")}</Button>}
              </div>
              <PDFField label="Or type your name"><input className={controlClass} value={typedName} onChange={e => setTypedName(e.target.value)} /></PDFField>
            </>}
          </div>
          <footer className="sticky bottom-0 flex justify-end gap-2 border-t bg-white p-4"><Button variant="outline" disabled={busy} onClick={() => setPanel(null)}>{__("Cancel")}</Button><Button type="submit" loading={busy}>{__(panelAction[panel])}</Button></footer>
        </form>
      </SideDrawer>}
    </div>
  </DesktopLayoutWrapper>;
}
