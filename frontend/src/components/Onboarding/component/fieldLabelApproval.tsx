/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import {
  useToast,
  useApprovalData,
  useApprovalActions,
  useSectionNav,
} from "../../../hooks/useOnboarding";
import { useScreenSize } from "../../../hooks/useScreenSize";
import type { ApprovalField, FieldLocalState, ChildField } from "../../../types/onboarding";
import StatusBadge from "../../shared/atoms/statusBadge";
import { Check, X } from "lucide-react";
import { BeatLoader } from "react-spinners";
import {
  sendBackToCandidate,
  approveOnboardingForm,
  getOnboardingReviewActionsEnabled,
} from "../../../services/employeeOnboardingService";
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

// ─── ChildTable ─────────────────────────────────────────────────────────────
// Renders a child-table (Table fieldtype) value as an actual table using the
// field's child_fields as columns and current_value as rows.
function ChildTable({ fields, rows }: { fields?: ChildField[]; rows: any[] }) {
  const cols = fields ?? [];

  if (!Array.isArray(rows) || rows.length === 0 || cols.length === 0) {
    return (
      <div className="mt-1 text-xs text-gray-500 border rounded-lg p-2">
        Empty table
      </div>
    );
  }

  // Strip HTML (e.g. Text Editor values like `<div class="ql-editor"><p>..</p></div>`)
  // down to plain text so cells show readable content, not markup.
  const stripHtml = (s: string): string => {
    if (!/<[^>]+>/.test(s)) return s;
    if (typeof window !== "undefined" && typeof DOMParser !== "undefined") {
      const doc = new DOMParser().parseFromString(s, "text/html");
      return (doc.body.textContent || "").trim();
    }
    return s.replace(/<[^>]+>/g, "").trim();
  };

  const cellText = (raw: any, fieldtype: string): string => {
    if (raw === undefined || raw === null || raw === "") return "—";
    if (fieldtype === "Check") return String(raw) === "1" ? "Yes" : "No";
    const text = stripHtml(String(raw));
    return text === "" ? "—" : text;
  };

  return (
    <div className="mt-1 border rounded-lg overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            {cols.map((c) => (
              <th
                key={c.fieldname}
                className="px-2 py-1 text-left font-semibold whitespace-nowrap border-b border-gray-100"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-50 last:border-0">
              {cols.map((c) => (
                <td
                  key={c.fieldname}
                  className="px-2 py-1 text-gray-800 align-top whitespace-nowrap"
                >
                  {cellText(row?.[c.fieldname], c.fieldtype)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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

        {field.fieldtype === "Table" ? (
  <ChildTable
    fields={field.child_fields}
    rows={Array.isArray(field.current_value) ? field.current_value : []}
  />
) : val ? (
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

  // ── Email-trigger actions (Send Back / Approve form) ──
  const [sendBackLoading, setSendBackLoading] = useState(false);
  const [approveFormLoading, setApproveFormLoading] = useState(false);
  // Approve All Remaining (one-click approval of every section)
  const [approveAllRemainingLoading, setApproveAllRemainingLoading] = useState(false);
  // Whether the review-action buttons (Send Back / Approve) are enabled —
  // driven by the Onboarding Settings flag and kept in sync with the action APIs.
  const [reviewActionsEnabled, setReviewActionsEnabled] = useState(false);

  // ── Hooks ──
  const { isDesktop } = useScreenSize();
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

  const { singleAction, bulkSelectedAction, sectionAction } =
    useApprovalActions(onboardingName, sections, patchFieldState, setFieldStates, showToast);

  const secKeys = Object.keys(sections);
  const { activeSection, activeIdx, goToSection, goNext, goPrev } = useSectionNav(
    secKeys,
    clearSelection
  );

  // ── Load on mount ──
  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line

  // ── Fetch whether review actions (Send Back / Approve) are enabled ──
  useEffect(() => {
    getOnboardingReviewActionsEnabled()
      .then(setReviewActionsEnabled)
      .catch(() => setReviewActionsEnabled(false));
  }, []);

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

  // Approve All Remaining — approve every section (all remaining pending fields)
  const handleApproveAllRemaining = async () => {
    if (approveAllRemainingLoading || secKeys.length === 0) return;
    setApproveAllRemainingLoading(true);
    try {
      for (const sec of secKeys) {
        await sectionAction(sec, "Approved");
      }
      showToast("All remaining fields approved", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Request failed";
      showToast(`Error: ${msg}`, "error");
    } finally {
      setApproveAllRemainingLoading(false);
    }
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

  // ── Email-trigger handlers ───────────────────────────────────────────────────

  // Return to Candidate — notify candidate of rejected fields
  const handleSendBack = async () => {
    if (!onboardingName || sendBackLoading) return;
    setSendBackLoading(true);
    try {
      const res = await sendBackToCandidate(onboardingName);
      const count = res?.rejected_count ?? 0;
      if (res?.enable_onboarding_review_actions !== undefined) {
        setReviewActionsEnabled(Number(res.enable_onboarding_review_actions) === 1);
      }
      showToast(
        `Sent back to candidate — ${count} rejected field${count === 1 ? "" : "s"}`,
        "success"
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Request failed";
      showToast(`Error: ${msg}`, "error");
    } finally {
      setSendBackLoading(false);
    }
  };

  // Approve — mark the whole form approved
  const handleApproveForm = async () => {
    if (!onboardingName || approveFormLoading) return;
    setApproveFormLoading(true);
    try {
      const res = await approveOnboardingForm(onboardingName);
      if (res?.enable_onboarding_review_actions !== undefined) {
        setReviewActionsEnabled(Number(res.enable_onboarding_review_actions) === 1);
      }
      showToast("Onboarding form approved", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Request failed";
      showToast(`Error: ${msg}`, "error");
    } finally {
      setApproveFormLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  const navigate = useNavigate();
  return (
    <div className="flex w-full h-[calc(100vh-73px)] overflow-hidden bg-gray-50 font-sans text-sm">

      {/* ── Sidebar (desktop only; mobile uses the section nav below) ── */}
      <aside
        className={`${
          isDesktop ? "flex" : "hidden"
        } w-64 bg-white border-r border-gray-100 flex-col h-full overflow-hidden flex-shrink-0`}
      >
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

        {/* ConfigPanel removed */}
      </aside>

      {/* ── Main ── */}
      <main className={`flex-1 min-w-0 flex flex-col h-full ${isDesktop ? "overflow-hidden" : "overflow-y-auto"}`}>

        {/* Loading */}
        {pageLoading && (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm p-5">
            <div className="text-center space-y-3">
              <BeatLoader color="#6172f3" size={10} className="mx-auto" />
              <p>Fetching onboarding data...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {!pageLoading && pageError && (
          <div className="bg-error-50 border border-error-200 rounded-xl p-4 text-error-800 text-sm max-w-xl m-5">
            <p className="font-medium mb-1">Failed to load data</p>
            <p className="text-xs text-error-600">{pageError}</p>
          </div>
        )}

        {/* Content */}
        {!pageLoading && !pageError && activeSection && (
          <div className={`flex flex-col w-full ${isDesktop ? "h-full min-h-0" : "min-h-full"}`}>

            {/* ── Sticky top dashboard ── */}
            <div className="shrink-0 px-4 sm:px-5 pt-5 pb-3 space-y-4 bg-gray-50 border-b border-gray-100">

            {/* Mobile top section nav — horizontal scroll (sidebar is hidden on mobile) */}
            <div className={isDesktop ? "hidden" : ""}>
              <p className="text-xs font-semibold text-gray-700">Onboarding Approval</p>
              <p className="text-xs text-gray-400 truncate mb-2">{onboardingName}</p>
              <div className="-mx-4 sm:-mx-5 px-4 sm:px-5 flex gap-2 overflow-x-auto scrollbar-hide">
                {secKeys.map((sec, i) => {
                  const fields = sections[sec].fields;
                  const approved = fields.filter(
                    (f) => fieldStates[f.fieldname]?.status === "Approved"
                  ).length;
                  const isDone = approved === fields.length && fields.length > 0;
                  const active = activeSection === sec;
                  return (
                    <button
                      key={sec}
                      onClick={() => goToSection(sec)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium whitespace-nowrap border transition-colors ${
                        active
                          ? "bg-primary-500 text-white border-primary-500"
                          : "bg-white text-gray-600 border-gray-200"
                      }`}
                    >
                      <span
                        className={`flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-semibold ${
                          active
                            ? "bg-white/20 text-white"
                            : isDone
                            ? "bg-success-100 text-success-800"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {isDone && !active ? "✓" : i + 1}
                      </span>
                      {sec}
                      <span className={active ? "text-white/80" : "text-gray-400"}>
                        ({approved}/{fields.length})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Breadcrumb */}
            <div className="text-xs text-gray-400">
            <span
  onClick={() => navigate(-1)}
  className="cursor-pointer hover:underline text-gray-500 transition-colors hover:text-blue-700"
>
  Onboarding
</span>
              <span className="text-gray-300">/</span>{" "}
              <span className="text-primary-600 font-medium">{activeSection}</span>
            </div>

            {/* Page header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{activeSection}</h2>
                <p className="text-xs text-gray-600 mt-1">
                  {curFields.length} fields · {curApproved} approved ·{" "}
                  {curFields.length - curApproved} remaining
                </p>
              </div>
              <div className={`flex items-center gap-2 [&>button]:flex-shrink-0 ${isDesktop ? "w-auto flex-wrap" : "w-full flex-nowrap overflow-x-auto scrollbar-hide -mx-4 sm:-mx-5 px-4 sm:px-5"}`}>
                {/* Section approve — immediate, no comment */}
                <button
                  onClick={() => handleSectionApprove(activeSection)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-success-50 text-success-800 border border-emerald-200 hover:bg-success-100 transition-colors"
                >
                  Approve Section
                </button>
                {/* Section reject — opens comment banner */}
                <button
                  onClick={() => handleSectionRejectClick(activeSection)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-error-50 text-error-600 border border-error-200 hover:bg-error-100 transition-colors"
                >
                  Return Section
                </button>
                {/* Approve All Remaining — approve every section in one click */}
                <button
                  onClick={handleApproveAllRemaining}
                  disabled={approveAllRemainingLoading}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-500 text-white border border-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Approve all remaining pending fields"
                >
                  {approveAllRemainingLoading ? "Approving..." : "Approve All Remaining"}
                </button>

                {/* Review actions (Return to Candidate / Approve Form) — shown only when enabled
                    via the Onboarding Settings review-actions flag */}
                {reviewActionsEnabled && (
                  <>
                    {/* Return to Candidate — email trigger notifying candidate of rejected fields */}
                    <button
                      onClick={handleSendBack}
                      disabled={sendBackLoading}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-error-600 text-white border border-error-700 hover:bg-error-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="Return to candidate — notify of rejected fields"
                    >
                      {sendBackLoading ? "Returning..." : "Return to Candidate"}
                    </button>

                    {/* Approve Form — approves all remaining, validates no rejections, sets status Approved */}
                    <button
                      onClick={handleApproveForm}
                      disabled={approveFormLoading}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-success-600 text-white border border-success-700 hover:bg-success-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="Approve the whole onboarding form"
                    >
                      {approveFormLoading ? "Approving..." : "Notify Approval"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Approved", value: approvedAll, color: "text-emerald-600" },
                { label: "Rejected", value: rejectedAll, color: "text-error-600" },
                { label: "Pending", value: pendingAll, color: "text-yellow-600" },
                { label: "Progress", value: `${pct}%`, color: "text-primary-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white border border-gray-100 rounded-xl p-3">
                  <p className={`text-lg font-semibold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-gray-100 rounded-lg overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-lg transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>

            </div>
            {/* ── end sticky top dashboard ── */}

            {/* ── Scrollable fields region (only this scrolls) ── */}
            <div className={`flex-1 px-4 sm:px-5 py-3 space-y-4 ${isDesktop ? "min-h-0 overflow-y-auto" : "overflow-visible"}`}>

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
              <div className="flex items-center gap-3 bg-primary-50 border border-primary-200 rounded-xl px-4 py-3 flex-wrap">
                <span className="text-xs text-primary-700 font-medium flex-1">
                  {curSelected} field{curSelected > 1 ? "s" : ""} selected
                </span>
                {/* Bulk approve — immediate, no comment */}
                <button
                  onClick={handleBulkApprove}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-success-200 bg-success-50 text-success-600 hover:bg-success-100 transition-colors"
                >
                  Approve selected
                </button>
                {/* Bulk reject — opens comment banner */}
                <button
                  onClick={handleBulkRejectClick}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-error-200 bg-error-50 text-error-600 hover:bg-error-100 transition-colors"
                >
                  Reject selected
                </button>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
              </div>
            )}

            {/* ── Bulk reject comment banner ── */}
            {bulkRejectPending && (
              <PendingRejectBanner
                label={`${bulkRejectPending.fieldnames.length} selected field${
                  bulkRejectPending.fieldnames.length > 1 ? "s" : ""
                }`}
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
            <div className="bg-white border border-gray-100 rounded-xl px-4 sm:px-5 py-4">

              {/* Card header */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
<div className="flex flex-col items-start gap-1">
<h3 className="text-sm font-bold text-gray-800">{activeSection}</h3>
<label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={allCurSelected}
                      onChange={(e) => toggleAllCurrentSection(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-gray-300 accent-primary-600 cursor-pointer"
                    />
                    Select all
                  </label>
            
</div>
                <div className="flex items-center gap-2">

                  <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-">
                    {activeIdx + 1} / {secKeys.length}
                  </span>
                </div>
              </div>

              {/* Field rows */}
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
            {/* ── end scrollable fields region ── */}

            {/* ── Sticky bottom footer ── */}
            <div className="shrink-0 px-4 sm:px-5 pt-3 pb-5 bg-white border-t border-gray-100 space-y-2">

            {/* Prev / Next navigation */}
            <div className="flex justify-between pt-1">
              <button
                onClick={goPrev}
                disabled={activeIdx <= 0}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>
              {activeIdx >= secKeys.length - 1 ? (
                <button
                  onClick={() => navigate("/webapp/employee-onboarding")}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-xs font-medium text-white transition-colors"
                >
                  ← Go Back
                </button>
              ) : (
                <button
                  onClick={goNext}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-xs font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              )}
            </div>

            </div>
            {/* ── end sticky bottom footer ── */}
          </div>
        )}
      </main>

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-xs font-medium border shadow-lg transition-all ${
            toast.type === "error" || toast.msg === "reject"
              ? "bg-error-50 text-error-600 border-error-200"
              : toast.type === "info"
              ? "bg-primary-50 text-primary-700 border-primary-200"
              : "bg-success-50 text-success-600 border-success-200"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}