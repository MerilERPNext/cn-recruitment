/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import {
  useToast,
  useApprovalData,
  useApprovalActions,
  useSectionNav,
} from "../../../hooks/useOnboarding";
import { useScreenSize } from "../../../hooks/useScreenSize";
import type { ApprovalField, FieldLocalState } from "../../../types/onboarding";
import StatusBadge from "../../shared/atoms/statusBadge";
import { Check, ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

// ─── Constants ────────────────────────────────────────────────────────────────

function getOnboardingNameFromUrl(): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("name") || params.get("onboarding_name");
  if (fromQuery) return fromQuery;

  const segments = window.location.pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  if (last && last.startsWith("HR-")) return last;
  return "";
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function displayValue(val: string | any[] | null | undefined): string {
  if (val === null || val === undefined || val === "") return "";
  if (Array.isArray(val)) {
    return val.length > 0
      ? `[Table: ${val.length} row${val.length > 1 ? "s" : ""}]`
      : "[Empty table]";
  }
  return String(val);
}

// ─── FieldRow ─────────────────────────────────────────────────────────────────

interface FieldRowProps {
  field: ApprovalField;
  state: FieldLocalState;
  checked: boolean;
  onCheck: (checked: boolean) => void;
  onApprove: () => void;
  onReject: (comment: string) => void;
  onCommentChange: (val: string) => void;
}

/**
 * Comment is mandatory ONLY for Reject.
 * Approve fires immediately without a comment gate.
 */
function FieldRow({
  field,
  state,
  checked,
  onCheck,
  onApprove,
  onReject,
  onCommentChange,
}: FieldRowProps) {
  const val = displayValue(field.current_value);

  const [pendingReject, setPendingReject] = useState(false);
  const [localComment, setLocalComment] = useState(state.comment || "");

  const handleCommentChange = (v: string) => {
    setLocalComment(v);
    onCommentChange(v);
  };

  const handleApproveClick = () => {
    // Approve fires immediately — no comment required
    setPendingReject(false);
    onApprove();
  };

  const handleRejectClick = () => {
    // Toggle reject comment box
    if (pendingReject) {
      setPendingReject(false);
      return;
    }
    setPendingReject(true);
  };

  const handleRejectSubmit = () => {
    onReject(localComment);
    setPendingReject(false);
    setLocalComment("");
  };

  const handleCancel = () => {
    setPendingReject(false);
  };

  const canSubmitReject = localComment.trim().length > 0;

  return (
    <div
      className={`flex items-center gap-3 py-3  border-b border-gray-100 last:border-0 transition-colors ${
        checked ? "bg-blue-50/40" : ""
      }`}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheck(e.target.checked)}
        className="mt-1 h-3 w-3 rounded border-gray-300 cursor-pointer flex-shrink-0 accent-primary-600"
        title="Select for bulk action"
      />

      {/* Field info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-800">{field.label}</span>
        </div>

        {val ? (
  <div className="mt-1">
    {field.fieldtype === "Attach" || field.fieldtype === "Attach Image" ? (
      <a
        href={val}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary-500 underline rounded-lg break-words text-xs border p-2 block"
      >
        View Attachment
      </a>
    ) : (
      <div
        className="text-xs text-gray-800 border rounded-lg p-2 break-words leading-relaxed w-full"
        dangerouslySetInnerHTML={{ __html: val }}
      />
    )}
  </div>
) : (
  <div className="text-xs text-gray-500 border rounded-lg p-2 break-words leading-relaxed w-full">
    Empty value
  </div>
)}

        {/* Mandatory comment box — shown only when reject is pending */}
        {pendingReject && (
          <div className="mt-2 space-y-1.5">
            <p className="text-xs font-medium text-gray-600">
              Comment required to{" "}
              <span className="text-error-600">reject</span> this field{" "}
              <span className="text-error-600">*</span>
            </p>
            <textarea
              rows={2}
              value={localComment}
              onChange={(e) => handleCommentChange(e.target.value)}
              placeholder="Add a mandatory comment before rejecting..."
              autoFocus
              className={`w-full text-xs px-2.5 py-1.5 border rounded-lg bg-white text-gray-700 resize-none outline-none focus:ring-1 placeholder-gray-400 ${
                canSubmitReject
                  ? "border-gray-200 focus:border-primary-400 focus:ring-primary-100"
                  : "border-yellow-300 focus:border-yellow-400 focus:ring-yellow-100"
              }`}
            />
            {!canSubmitReject && (
              <p className="text-xs text-yellow-600">Please enter a comment to continue.</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleRejectSubmit}
                disabled={!canSubmitReject || state.loading}
                className="px-3 py-1 text-xs font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-white bg-error-600 hover:bg-error-800"
              >
                {state.loading ? "Submitting..." : "Confirm Reject"}
              </button>
              <button
                onClick={handleCancel}
                disabled={state.loading}
                className="px-3 py-1 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-5 flex-shrink-0 flex-wrap justify-end">
        <StatusBadge status={state.status}/>
        <div className="h-8 flex items-center px-2  rounded-3xl bg-gray-10 w-fit">
        <div className="relative group w-fit ">
  <button
    onClick={handleApproveClick}
    disabled={state.loading}
    className={`h-8 flex items-center gap-1 px-1 py-1 rounded-3xl font-bold bg-gray-10 ${
      state.status === "Approved"
        ? "text-green-500 "
        : "text-green-500 "
    }`}
  >
    <Check className="w-3.5 h-3.5" strokeWidth={2} />
  </button>

  {/* Tooltip */}
  <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 
    whitespace-nowrap rounded bg-black text-white text-xs px-2 py-1 
    opacity-0 group-hover:opacity-100 transition pointer-events-none">
    Approve
  </span>
</div>
<span className="w-[1px] h-4 bg-gray-300" />
<div className="relative group w-fit">
        <button
          onClick={handleRejectClick}
          disabled={state.loading}
          title="Reject"
          className={`h-8 w-5 flex items-center justify-center rounded-lg text-xs font-bold transition-all disabled:opacity-40 ${
            state.status === "Rejected"
              ? " text-red-500 "
              : pendingReject
              ? " text-red-500 "
              : " text-red-500 "
          }`}
        >
          <X  className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
        <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 
    whitespace-nowrap rounded bg-black text-white text-xs px-2 py-1 
    opacity-0 group-hover:opacity-100 transition pointer-events-none">
    Reject
  </span>
  </div>
        </div>

        {state.loading && (
          <div className="h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>
      </div>
  );
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({
  index,
  label,
  total,
  approved,
  rejected,
  active,
  onClick,
}: {
  index: number;
  label: string;
  total: number;
  approved: number;
  rejected: number;
  active: boolean;
  onClick: () => void;
}) {
  const isDone = approved === total && total > 0;
  const isPartial = approved > 0 || rejected > 0;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-left transition-all ${
        active ? "bg-primary-500 text-white shadow-sm" : "hover:bg-gray-100 text-gray-700"
      }`}
    >
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
          active
            ? "bg-white/20 text-white"
            : isDone
            ? "bg-success-100 text-success-800"
            : isPartial
            ? "bg-amber-100 text-amber-800"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {isDone && !active ? "✓" : index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-medium truncate ${active ? "text-white" : "text-gray-800"}`}>
          {label}
        </div>
        <div className={`text-xs ${active ? "text-blue-100" : "text-gray-400"}`}>
          {approved}/{total} approved
        </div>
      </div>
      {isDone && !active && (
        <div className="w-1.5 h-1.5 rounded-full bg-success-200 flex-shrink-0" />
      )}
    </button>
  );
}

// ─── PendingActionBanner ──────────────────────────────────────────────────────

/**
 * Inline banner for section-level or bulk-selected reject actions.
 * Approve actions at section/bulk level do NOT need this banner.
 */
function PendingRejectBanner({
  label,
  comment,
  onCommentChange,
  onConfirm,
  onCancel,
  loading,
}: {
  label: string;
  comment: string;
  onCommentChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const canSubmit = comment.trim().length > 0;
  return (
    <div className="rounded-xl border px-4 py-3 space-y-2 bg-error-50 border-error-200">
      <p className="text-xs font-semibold text-gray-700">
        {label} —{" "}
        <span className="text-error-600">Rejected</span> pending
      </p>
      <p className="text-xs text-gray-500">
        A comment is required before confirming this rejection.{" "}
        <span className="text-error-600">*</span>
      </p>
      <textarea
        rows={2}
        autoFocus
        value={comment}
        onChange={(e) => onCommentChange(e.target.value)}
        placeholder="Enter your comment..."
        className={`w-full text-xs px-2.5 py-1.5 border rounded-lg bg-white text-gray-700 resize-none outline-none focus:ring-1 placeholder-gray-400 ${
          canSubmit
            ? "border-gray-200 focus:border-primary-400 focus:ring-blue-100"
            : "border-yellow-300 focus:border-yellow-400 focus:ring-yellow-100"
        }`}
      />
      {!canSubmit && (
        <p className="text-xs text-yellow-600">Please enter a comment to continue.</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          disabled={!canSubmit || loading}
          className="px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-error-600 hover:bg-error-800"
        >
          {loading ? "Submitting..." : "Confirm Reject"}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── OnboardingFieldApproval (Main Component) ─────────────────────────────────

export default function OnboardingFieldApproval() {
  // ── Onboarding name from URL ──
  const onboardingName = getOnboardingNameFromUrl();

  // ── Selected fields state (multi-checkbox) ──
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const clearSelection = () => setSelectedFields(new Set());

  // ── Section pending reject (mandatory comment gate) ──
  const [sectionRejectPending, setSectionRejectPending] = useState<{
    sectionName: string;
    comment: string;
    loading: boolean;
  } | null>(null);

  // ── Bulk-selected pending reject (mandatory comment gate) ──
  const [bulkRejectPending, setBulkRejectPending] = useState<{
    fieldnames: string[];
    comment: string;
    loading: boolean;
  } | null>(null);

  // ── Hooks ──
  const { toast, showToast } = useToast();

  const {
    allFields,
    sections,
    fieldStates,
    pageLoading,
    pageError,
    loadData,
    patchFieldState,
    setFieldStates,
  } = useApprovalData(onboardingName);

  const navigate = useNavigate();

  const { singleAction, bulkSelectedAction, sectionAction, bulkApproveAllPending } =
    useApprovalActions(onboardingName, sections, patchFieldState, setFieldStates, showToast);

  const { isDesktop } = useScreenSize();

  const secKeys = Object.keys(sections);
  const { activeSection, activeIdx, goToSection, goNext, goPrev } = useSectionNav(
    secKeys,
    clearSelection
  );

  // ── Load on mount ──
  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line

  // ── Derived values ──
  const totalAll = allFields.length;
  const approvedAll = Object.values(fieldStates).filter((s) => s.status === "Approved").length;
  const rejectedAll = Object.values(fieldStates).filter((s) => s.status === "Rejected").length;
  const pendingAll = totalAll - approvedAll - rejectedAll;
  const pct = totalAll ? Math.round((approvedAll / totalAll) * 100) : 0;

  const curFields = activeSection ? sections[activeSection]?.fields ?? [] : [];
  const curApproved = curFields.filter((f) => fieldStates[f.fieldname]?.status === "Approved").length;
  const curSelected = [...selectedFields].filter((fn) =>
    curFields.some((f) => f.fieldname === fn)
  ).length;
  const allCurSelected =
    curFields.length > 0 && curFields.every((f) => selectedFields.has(f.fieldname));

  // ── Toggle helpers ──
  const toggleField = (fieldname: string, checked: boolean) => {
    const next = new Set(selectedFields);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    checked ? next.add(fieldname) : next.delete(fieldname);
    setSelectedFields(next);
  };

  const toggleAllCurrentSection = (checked: boolean) => {
    const next = new Set(selectedFields);
    curFields.forEach((f) => (checked ? next.add(f.fieldname) : next.delete(f.fieldname)));
    setSelectedFields(next);
  };

  // ── Section actions ────────────────────────────────────────────────────────

  // Section approve — fires immediately, no comment needed
  const handleSectionApprove = async (sectionName: string) => {
    await sectionAction(sectionName, "Approved");
  };

  // Section reject — open comment banner
  const handleSectionRejectClick = (sectionName: string,) => {
    setSectionRejectPending({ sectionName, comment: "", loading: false });
    setBulkRejectPending(null);
  };

  const handleSectionRejectConfirm = async () => {
    if (!sectionRejectPending) return;
    setSectionRejectPending((p) => p && { ...p, loading: true });
    try {
      await sectionAction(sectionRejectPending.sectionName, "Rejected", sectionRejectPending.comment);
    } finally {
      setSectionRejectPending(null);
    }
  };

  // ── Bulk-selected actions ──────────────────────────────────────────────────

  const getSelectedInSection = () =>
    [...selectedFields].filter((fn) => curFields.some((f) => f.fieldname === fn));

  // Bulk approve selected — fires immediately, no comment needed
  const handleBulkApprove = async () => {
    const toUpdate = getSelectedInSection();
    if (toUpdate.length === 0) return;
    await bulkSelectedAction(toUpdate, "Approved");
    clearSelection();
  };

  // Bulk reject selected — open comment banner
  const handleBulkRejectClick = () => {
    const toUpdate = getSelectedInSection();
    if (toUpdate.length === 0) return;
    setBulkRejectPending({ fieldnames: toUpdate, comment: "", loading: false });
    setSectionRejectPending(null);
  };

  const handleBulkRejectConfirm = async () => {
    if (!bulkRejectPending) return;
    setBulkRejectPending((p) => p && { ...p, loading: true });
    try {
      await bulkSelectedAction(bulkRejectPending.fieldnames, "Rejected", bulkRejectPending.comment);
      clearSelection();
    } finally {
      setBulkRejectPending(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className={`flex w-full min-h-screen bg-gray-50 font-sans text-sm ${isDesktop ? "flex-row" : "flex-col"}`}>

      {/* ── Sidebar (Desktop Only) ── */}
      {isDesktop && (
        <aside className="w-64 bg-white border-r border-gray-100 flex flex-col sticky top-0 h-screen overflow-hidden flex-shrink-0">
          <div className="px-4 py-4 border-b border-gray-100">
            <h1 className="text-sm font-semibold text-gray-900">Onboarding Approval</h1>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{onboardingName}</p>
          </div>

          <nav className="flex-1 p-2 overflow-y-auto">
            {pageLoading && (
              <p className="text-xs text-gray-400 text-center py-6">Loading sections...</p>
            )}
            {!pageLoading &&
              secKeys.map((sec, i) => {
                const fields = sections[sec].fields;
                const approved = fields.filter(
                  (f) => fieldStates[f.fieldname]?.status === "Approved"
                ).length;
                const rejected = fields.filter(
                  (f) => fieldStates[f.fieldname]?.status === "Rejected"
                ).length;
                return (
                  <NavItem
                    key={sec}
                    index={i}
                    label={sec}
                    total={fields.length}
                    approved={approved}
                    rejected={rejected}
                    active={activeSection === sec}
                    onClick={() => goToSection(sec)}
                  />
                );
              })}
          </nav>
        </aside>
      )}

      {/* ── Main ── */}
      <main className={`flex-1 overflow-y-auto min-w-0 ${isDesktop ? "p-5" : "p-3 pb-20"}`}>

        {!isDesktop && (
          <div className="mb-4 space-y-3">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate(-1)}
                className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-gray-700" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Onboarding Approval</h1>
                <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{onboardingName}</p>
              </div>
            </div>

            {/* Horizontal Section Tabs */}
            {!pageLoading && secKeys.length > 0 && (
              <div className="flex overflow-x-auto gap-2 py-1 no-scrollbar -mx-3 px-3">
                {secKeys.map((sec) => {
                  const fields = sections[sec].fields;
                  const approved = fields.filter(
                    (f) => fieldStates[f.fieldname]?.status === "Approved"
                  ).length;
                  const isDone = approved === fields.length && fields.length > 0;
                  const isActive = activeSection === sec;

                  return (
                    <button
                      key={sec}
                      onClick={() => goToSection(sec)}
                      className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-medium border transition-all ${
                        isActive
                          ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                          : isDone
                          ? "bg-success-50 text-success-700 border-success-200"
                          : "bg-white text-gray-600 border-gray-200"
                      }`}
                    >
                      {sec}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {pageLoading && (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
            <div className="text-center space-y-3">
              <div className="h-10 w-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Fetching onboarding data...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {!pageLoading && pageError && (
          <div className="bg-error-50 border border-error-200 rounded-xl p-4 text-error-800 text-sm max-w-xl">
            <p className="font-medium mb-1">Failed to load data</p>
            <p className="text-xs text-error-600">{pageError}</p>
          </div>
        )}

        {/* Content */}
        {!pageLoading && !pageError && activeSection && (
          <div className="w-full space-y-4">

            {/* Breadcrumb (Desktop Only) */}
            {isDesktop && (
              <div className="text-xs text-gray-400">
                Onboarding{" "}
                <span className="text-gray-300">/</span>{" "}
                <span className="text-primary-600 font-medium">{activeSection}</span>
              </div>
            )}

            {/* Page header */}
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={`${isDesktop ? "text-xl" : "text-lg"} font-semibold text-gray-900`}>{activeSection}</h2>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {curFields.length} fields · {curApproved} approved ·{" "}
                    {curFields.length - curApproved} remaining
                  </p>
                </div>
                {!isDesktop && (
                   <div className="flex items-center gap-1.5">
                     <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-lg">
                       {activeIdx + 1} / {secKeys.length}
                     </span>
                   </div>
                )}
              </div>

              <div className="flex justify-end items-center gap-2 flex-wrap">
                {/* Section approve — immediate, no comment */}
                <button
                  onClick={() => handleSectionApprove(activeSection)}
                  className="flex-1 sm:flex-none px-3 py-1.5 text-[11px] font-medium rounded-lg bg-success-50 text-success-800 border border-emerald-200 hover:bg-success-100 transition-colors"
                >
                  Approve section
                </button>
                {/* Section reject — opens comment banner */}
                <button
                  onClick={() => handleSectionRejectClick(activeSection)}
                  className="flex-1 sm:flex-none px-3 py-1.5 text-[11px] font-medium rounded-lg bg-error-50 text-error-600 border border-error-200 hover:bg-error-100 transition-colors"
                >
                  Reject section
                </button>
                {/* Bulk approve all pending — no comment required */}
                <button
                  onClick={bulkApproveAllPending}
                  className="w-full sm:w-auto px-3 py-1.5 text-[11px] font-medium rounded-lg bg-primary-600 text-white border border-primary-600 hover:bg-primary-700 transition-colors"
                  title="Approve all pending fields across entire document"
                >
                  Approve all pending
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className={`grid ${isDesktop ? "grid-cols-4" : "grid-cols-2"} gap-2`}>
              {[
                { label: "Approved", value: approvedAll, color: "text-emerald-600" },
                { label: "Rejected", value: rejectedAll, color: "text-error-600" },
                { label: "Pending", value: pendingAll, color: "text-yellow-600" },
                { label: "Progress", value: `${pct}%`, color: "text-primary-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white border border-gray-100 shadow-sm rounded-xl p-3">
                  <p className={`text-base font-bold ${color}`}>{value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-gray-200 rounded-lg overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-lg transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* ── Section reject comment banner ── */}
            {sectionRejectPending && (
              <PendingRejectBanner
                label={`Section: ${sectionRejectPending.sectionName}`}
                comment={sectionRejectPending.comment}
                onCommentChange={(v) =>
                  setSectionRejectPending((p) => p && { ...p, comment: v })
                }
                onConfirm={handleSectionRejectConfirm}
                onCancel={() => setSectionRejectPending(null)}
                loading={sectionRejectPending.loading}
              />
            )}

            {/* ── Bulk-selected action bar ── */}
            {curSelected > 0 && (
              <div className="flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 sticky bottom-4 z-20 shadow-lg">
                <span className="text-[11px] text-primary-700 font-bold flex-1">
                  {curSelected} selected
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={handleBulkApprove}
                    className="p-1.5 rounded-lg bg-success-600 text-white shadow-sm"
                    title="Approve selected"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleBulkRejectClick}
                    className="p-1.5 rounded-lg bg-error-600 text-white shadow-sm"
                    title="Reject selected"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={clearSelection}
                    className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-600"
                    title="Clear selection"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── Bulk reject comment banner ── */}
            {bulkRejectPending && (
              <PendingRejectBanner
                label={`${bulkRejectPending.fieldnames.length} fields`}
                comment={bulkRejectPending.comment}
                onCommentChange={(v) =>
                  setBulkRejectPending((p) => p && { ...p, comment: v })
                }
                onConfirm={handleBulkRejectConfirm}
                onCancel={() => setBulkRejectPending(null)}
                loading={bulkRejectPending.loading}
              />
            )}

            {/* Fields card */}
            <div className={`bg-white border border-gray-100 rounded-xl ${isDesktop ? "px-5 py-4" : "px-3 py-3"}`}>

              {/* Card header */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                <div className="flex flex-col items-start gap-1">
                  <h3 className="text-xs font-bold text-gray-800">Field Checklist</h3>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-gray-500">
                    <input
                      type="checkbox"
                      checked={allCurSelected}
                      onChange={(e) => toggleAllCurrentSection(e.target.checked)}
                      className="h-3 w-3 rounded border-gray-300 accent-primary-600 cursor-pointer"
                    />
                    Select all
                  </label>
                </div>
                {isDesktop && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded">
                      {activeIdx + 1} / {secKeys.length}
                    </span>
                  </div>
                )}
              </div>

              {/* Field rows */}
              <div className="space-y-1">
                {curFields.map((field) => {
                  const state = fieldStates[field.fieldname];
                  if (!state) return null;
                  return (
                    <FieldRow
                      key={field.fieldname}
                      field={field}
                      state={state}
                      checked={selectedFields.has(field.fieldname)}
                      onCheck={(checked) => toggleField(field.fieldname, checked)}
                      onApprove={() => singleAction(field.fieldname, "Approved")}
                      onReject={(comment) => singleAction(field.fieldname, "Rejected", comment)}
                      onCommentChange={(val) =>
                        patchFieldState(field.fieldname, { comment: val })
                      }
                    />
                  );
                })}
              </div>
            </div>

            {/* Prev / Next navigation */}
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={goPrev}
                disabled={activeIdx <= 0}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-40 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                {isDesktop && "Previous"}
              </button>
              
              {!isDesktop && (
                <div className="flex gap-1.5">
                   {secKeys.map((_, idx) => (
                     <div 
                       key={idx} 
                       className={`w-1.5 h-1.5 rounded-lg transition-all ${idx === activeIdx ? "bg-primary-500 w-3" : "bg-gray-200"}`} 
                     />
                   ))}
                </div>
              )}

              <button
                onClick={goNext}
                disabled={activeIdx >= secKeys.length - 1}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-primary-700 disabled:opacity-40 transition-all"
              >
                {isDesktop && "Next"}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-[11px] font-bold border shadow-xl transition-all w-[90%] max-w-sm text-center ${
            toast.type === "error" || toast.msg === "reject"
              ? "bg-error-50 text-error-600 border-error-100"
              : toast.type === "info"
              ? "bg-primary-50 text-primary-700 border-primary-100"
              : "bg-success-50 text-success-600 border-success-100"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}