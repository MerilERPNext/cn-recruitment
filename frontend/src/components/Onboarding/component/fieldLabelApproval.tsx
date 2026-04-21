/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import {
  useToast,
  useApprovalData,
  useApprovalActions,
  useSectionNav,
} from "../../../hooks/useOnboarding";
import type { ApiConfig, ApprovalField, FieldLocalState } from "../../../types/onboarding";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Read onboardingName from URL search params (?name=HR-EMP-ONB-2026-00001)
 *  or fall back to the last path segment, then to a hard-coded default.
 */
function getOnboardingNameFromUrl(): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("name") || params.get("onboarding_name");
  if (fromQuery) return fromQuery;
  // Try last path segment e.g. /onboarding/HR-EMP-ONB-2026-00001
  const segments = window.location.pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  if (last && last.startsWith("HR-")) return last;
  return "";
}

const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: window?.location?.origin || "http://localhost:8016",
  onboardingName: getOnboardingNameFromUrl(),
  authToken: "",
};

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

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium border ${
        STATUS_STYLES[status] ?? "bg-gray-50 text-gray-600 border-gray-200"
      }`}
    >
      {status}
    </span>
  );
}

// ─── FieldRow ─────────────────────────────────────────────────────────────────

interface FieldRowProps {
  field: ApprovalField;
  state: FieldLocalState;
  checked: boolean;
  onCheck: (checked: boolean) => void;
  /** Called when user clicks Approve/Reject and has already filled comment */
  onApprove: (comment: string) => void;
  onReject: (comment: string) => void;
  onCommentChange: (val: string) => void;
}

/**
 * Mandatory-comment flow:
 *  1. User clicks ✓ or ✗ → comment box opens immediately (showComment = true)
 *  2. pendingAction stores which action is waiting ("Approved" | "Rejected" | null)
 *  3. "Submit" button is disabled until comment has at least 1 non-whitespace char
 *  4. On submit → calls onApprove/onReject with the typed comment, resets local state
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

  // Local state: which action is waiting for a comment
  const [pendingAction, setPendingAction] = useState<"Approved" | "Rejected" | null>(null);
  const [localComment, setLocalComment] = useState(state.comment || "");

  // Sync local comment → parent whenever it changes
  const handleCommentChange = (v: string) => {
    setLocalComment(v);
    onCommentChange(v);
  };

  const handleActionClick = (action: "Approved" | "Rejected") => {
    // If same action clicked again while pending → cancel
    if (pendingAction === action) {
      setPendingAction(null);
      return;
    }
    setPendingAction(action);
  };

  const handleSubmit = () => {
    if (!pendingAction) return;
    if (pendingAction === "Approved") onApprove(localComment);
    else onReject(localComment);
    setPendingAction(null);
    setLocalComment("");
  };

  const handleCancel = () => {
    setPendingAction(null);
  };

  const commentRequired = pendingAction !== null;
  const canSubmit = localComment.trim().length > 0;

  return (
    <div
      className={`flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 transition-colors ${
        checked ? "bg-blue-50/40" : ""
      }`}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheck(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-gray-300 cursor-pointer flex-shrink-0 accent-blue-600"
        title="Select for bulk action"
      />

      {/* Field info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-800">{field.label}</span>
          <span className="text-xs text-gray-400 font-mono">{field.fieldtype}</span>
        </div>

        {val ? (
          <div className="mt-1">
            {val?.startsWith("http") ? (
              <a
                href={val}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline break-words text-xs border p-2 block"
              >
                {val}
              </a>
            ) : (
              <div
                className="text-xs text-gray-500 border p-2 break-words leading-relaxed w-full"
                dangerouslySetInnerHTML={{ __html: val }}
              />
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 mt-0.5 italic">No value</p>
        )}

        {/* Mandatory comment box — shown when an action is pending */}
        {commentRequired && (
          <div className="mt-2 space-y-1.5">
            <p className="text-xs font-medium text-gray-600">
              Comment required to{" "}
              <span
                className={
                  pendingAction === "Approved" ? "text-emerald-600" : "text-red-500"
                }
              >
                {pendingAction?.toLowerCase()}
              </span>{" "}
              this field <span className="text-red-500">*</span>
            </p>
            <textarea
              rows={2}
              value={localComment}
              onChange={(e) => handleCommentChange(e.target.value)}
              placeholder="Add a mandatory comment before submitting..."
              autoFocus
              className={`w-full text-xs px-2.5 py-1.5 border rounded-lg bg-white text-gray-700 resize-none outline-none focus:ring-1 placeholder-gray-400 ${
                canSubmit
                  ? "border-gray-200 focus:border-blue-400 focus:ring-blue-100"
                  : "border-amber-300 focus:border-amber-400 focus:ring-amber-100"
              }`}
            />
            {!canSubmit && (
              <p className="text-xs text-amber-600">Please enter a comment to continue.</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || state.loading}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-white ${
                  pendingAction === "Approved"
                    ? "bg-emerald-500 hover:bg-emerald-600"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {state.loading ? "Submitting..." : `Confirm ${pendingAction}`}
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
      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
        <StatusBadge status={state.status} />

        <button
          onClick={() => handleActionClick("Approved")}
          disabled={state.loading}
          title="Approve"
          className={`h-7 w-7 flex items-center justify-center rounded-lg border text-xs font-bold transition-all disabled:opacity-40 ${
            state.status === "Approved"
              ? "bg-emerald-500 text-white border-emerald-500"
              : pendingAction === "Approved"
              ? "bg-emerald-200 text-emerald-700 border-emerald-300"
              : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500"
          }`}
        >
          ✓
        </button>

        <button
          onClick={() => handleActionClick("Rejected")}
          disabled={state.loading}
          title="Reject"
          className={`h-7 w-7 flex items-center justify-center rounded-lg border text-xs font-bold transition-all disabled:opacity-40 ${
            state.status === "Rejected"
              ? "bg-red-500 text-white border-red-500"
              : pendingAction === "Rejected"
              ? "bg-red-200 text-red-700 border-red-300"
              : "bg-red-50 text-red-500 border-red-200 hover:bg-red-500 hover:text-white hover:border-red-500"
          }`}
        >
          ✗
        </button>

        {state.loading && (
          <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
        active ? "bg-blue-600 text-white shadow-sm" : "hover:bg-gray-100 text-gray-700"
      }`}
    >
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
          active
            ? "bg-white/20 text-white"
            : isDone
            ? "bg-emerald-100 text-emerald-700"
            : isPartial
            ? "bg-amber-100 text-amber-700"
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
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
      )}
    </button>
  );
}

// ─── ConfigPanel ──────────────────────────────────────────────────────────────

function ConfigPanel({
  config,
  onConfigChange,
  onReload,
  loading,
}: {
  config: ApiConfig;
  onConfigChange: (patch: Partial<ApiConfig>) => void;
  onReload: () => void;
  loading: boolean;
}) {
  const fields: { label: string; key: keyof ApiConfig; placeholder: string }[] = [
    { label: "Onboarding name", key: "onboardingName", placeholder: "HR-EMP-ONB-2026-00001" },
    { label: "API base URL", key: "baseUrl", placeholder: "http://localhost:8016" },
    { label: "Auth token (key:secret)", key: "authToken", placeholder: "api_key:api_secret" },
  ];

  return (
    <div className="border-t border-gray-100 p-3 space-y-2">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Connection</p>
      {fields.map(({ label, key, placeholder }) => (
        <div key={key}>
          <p className="text-xs text-gray-400 mb-1">{label}</p>
          <input
            value={config[key]}
            onChange={(e) => onConfigChange({ [key]: e.target.value })}
            placeholder={placeholder}
            className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md bg-gray-50 text-gray-700 outline-none focus:border-blue-400"
          />
        </div>
      ))}
      <button
        onClick={onReload}
        disabled={loading}
        className="w-full mt-1 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
      >
        {loading ? "Loading..." : "Reload data"}
      </button>
    </div>
  );
}

// ─── SectionCommentModal ──────────────────────────────────────────────────────

/**
 * Inline banner shown above the fields card when a section-level or
 * bulk-selected action is waiting for a mandatory comment.
 */
function PendingActionBanner({
  label,
  action,
  onCommentChange,
  comment,
  onConfirm,
  onCancel,
  loading,
}: {
  label: string;
  action: "Approved" | "Rejected";
  comment: string;
  onCommentChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const canSubmit = comment.trim().length > 0;
  return (
    <div
      className={`rounded-xl border px-4 py-3 space-y-2 ${
        action === "Approved"
          ? "bg-emerald-50 border-emerald-200"
          : "bg-red-50 border-red-200"
      }`}
    >
      <p className="text-xs font-semibold text-gray-700">
        {label} —{" "}
        <span className={action === "Approved" ? "text-emerald-700" : "text-red-600"}>
          {action}
        </span>{" "}
        pending
      </p>
      <p className="text-xs text-gray-500">
        A comment is required before confirming this action.{" "}
        <span className="text-red-500">*</span>
      </p>
      <textarea
        rows={2}
        autoFocus
        value={comment}
        onChange={(e) => onCommentChange(e.target.value)}
        placeholder="Enter your comment..."
        className={`w-full text-xs px-2.5 py-1.5 border rounded-lg bg-white text-gray-700 resize-none outline-none focus:ring-1 placeholder-gray-400 ${
          canSubmit
            ? "border-gray-200 focus:border-blue-400 focus:ring-blue-100"
            : "border-amber-300 focus:border-amber-400 focus:ring-amber-100"
        }`}
      />
      {!canSubmit && (
        <p className="text-xs text-amber-600">Please enter a comment to continue.</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          disabled={!canSubmit || loading}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            action === "Approved"
              ? "bg-emerald-500 hover:bg-emerald-600"
              : "bg-red-500 hover:bg-red-600"
          }`}
        >
          {loading ? "Submitting..." : `Confirm ${action}`}
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
  // ── API config state ──
  const [config, setConfig] = useState<ApiConfig>(DEFAULT_CONFIG);
  const patchConfig = (patch: Partial<ApiConfig>) =>
    setConfig((prev) => ({ ...prev, ...patch }));

  // ── Selected fields state (multi-checkbox) ──
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const clearSelection = () => setSelectedFields(new Set());

  // ── Section pending action (mandatory comment gate) ──
  const [sectionPending, setSectionPending] = useState<{
    sectionName: string;
    action: "Approved" | "Rejected";
    comment: string;
    loading: boolean;
  } | null>(null);

  // ── Bulk-selected pending action (mandatory comment gate) ──
  const [bulkPending, setBulkPending] = useState<{
    fieldnames: string[];
    action: "Approved" | "Rejected";
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
  } = useApprovalData(config);

  const { singleAction, bulkSelectedAction, sectionAction, bulkApproveAllPending } =
    useApprovalActions(config, sections, patchFieldState, setFieldStates, showToast);

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

  // ── Section action: open comment banner ────────────────────────────────────
  const handleSectionActionClick = (sectionName: string, action: "Approved" | "Rejected") => {
    setSectionPending({ sectionName, action, comment: "", loading: false });
    setBulkPending(null); // close bulk banner if open
  };

  const handleSectionConfirm = async () => {
    if (!sectionPending) return;
    setSectionPending((p) => p && { ...p, loading: true });
    try {
      await sectionAction(sectionPending.sectionName, sectionPending.action);
    } finally {
      setSectionPending(null);
    }
  };

  // ── Bulk-selected action: open comment banner ──────────────────────────────
  const handleBulkActionClick = (action: "Approved" | "Rejected") => {
    const toUpdate = [...selectedFields].filter((fn) =>
      curFields.some((f) => f.fieldname === fn)
    );
    if (toUpdate.length === 0) return;
    setBulkPending({ fieldnames: toUpdate, action, comment: "", loading: false });
    setSectionPending(null); // close section banner if open
  };

  const handleBulkConfirm = async () => {
    if (!bulkPending) return;
    setBulkPending((p) => p && { ...p, loading: true });
    try {
      await bulkSelectedAction(bulkPending.fieldnames, bulkPending.action);
      clearSelection();
    } finally {
      setBulkPending(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex w-full min-h-screen bg-gray-50 font-sans text-sm">

      {/* ── Sidebar ── */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col sticky top-0 h-screen overflow-hidden flex-shrink-0">
        <div className="px-4 py-4 border-b border-gray-100">
          <h1 className="text-sm font-semibold text-gray-900">Onboarding Approval</h1>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{config.onboardingName}</p>
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

        <ConfigPanel
          config={config}
          onConfigChange={patchConfig}
          onReload={loadData}
          loading={pageLoading}
        />
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 p-5 overflow-y-auto min-w-0">

        {/* Loading */}
        {pageLoading && (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
            <div className="text-center space-y-3">
              <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Fetching onboarding data...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {!pageLoading && pageError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm max-w-xl">
            <p className="font-medium mb-1">Failed to load data</p>
            <p className="text-xs text-red-500">{pageError}</p>
            <p className="text-xs text-red-400 mt-2">
              Check your API base URL, onboarding name, and auth token in the sidebar.
            </p>
          </div>
        )}

        {/* Content */}
        {!pageLoading && !pageError && activeSection && (
          <div className="max-w-3xl space-y-4">

            {/* Breadcrumb */}
            <div className="text-xs text-gray-400">
              Onboarding{" "}
              <span className="text-gray-300">/</span>{" "}
              <span className="text-blue-600 font-medium">{activeSection}</span>
            </div>

            {/* Page header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{activeSection}</h2>
                <p className="text-xs text-gray-400 mt-1">
                  {curFields.length} fields · {curApproved} approved ·{" "}
                  {curFields.length - curApproved} remaining
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Section approve/reject → opens comment banner */}
                <button
                  onClick={() => handleSectionActionClick(activeSection, "Approved")}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                >
                  Approve section
                </button>
                <button
                  onClick={() => handleSectionActionClick(activeSection, "Rejected")}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                >
                  Reject section
                </button>
                {/* Bulk approve all pending — no comment required (document level, untouched) */}
                <button
                  onClick={bulkApproveAllPending}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white border border-blue-600 hover:bg-blue-700 transition-colors"
                  title="Approve all pending fields across entire document"
                >
                  Approve all pending
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Approved", value: approvedAll, color: "text-emerald-600" },
                { label: "Rejected", value: rejectedAll, color: "text-red-500" },
                { label: "Pending", value: pendingAll, color: "text-amber-600" },
                { label: "Progress", value: `${pct}%`, color: "text-blue-600" },
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
                className="h-full bg-blue-500 rounded-lg transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* ── Section pending comment banner ── */}
            {sectionPending && (
              <PendingActionBanner
                label={`Section: ${sectionPending.sectionName}`}
                action={sectionPending.action}
                comment={sectionPending.comment}
                onCommentChange={(v) =>
                  setSectionPending((p) => p && { ...p, comment: v })
                }
                onConfirm={handleSectionConfirm}
                onCancel={() => setSectionPending(null)}
                loading={sectionPending.loading}
              />
            )}

            {/* ── Bulk-selected action bar ── */}
            {curSelected > 0 && (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex-wrap">
                <span className="text-xs text-blue-700 font-medium flex-1">
                  {curSelected} field{curSelected > 1 ? "s" : ""} selected
                </span>
                <button
                  onClick={() => handleBulkActionClick("Approved")}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                >
                  Approve selected
                </button>
                <button
                  onClick={() => handleBulkActionClick("Rejected")}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
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

            {/* ── Bulk pending comment banner ── */}
            {bulkPending && (
              <PendingActionBanner
                label={`${bulkPending.fieldnames.length} selected field${
                  bulkPending.fieldnames.length > 1 ? "s" : ""
                }`}
                action={bulkPending.action}
                comment={bulkPending.comment}
                onCommentChange={(v) =>
                  setBulkPending((p) => p && { ...p, comment: v })
                }
                onConfirm={handleBulkConfirm}
                onCancel={() => setBulkPending(null)}
                loading={bulkPending.loading}
              />
            )}

            {/* Fields card */}
            <div className="bg-white border border-gray-100 rounded-xl px-5 py-4">

              {/* Card header */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-800">{activeSection}</h3>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={allCurSelected}
                      onChange={(e) => toggleAllCurrentSection(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-gray-300 accent-blue-600 cursor-pointer"
                    />
                    Select all
                  </label>
                  <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-">
                    {activeIdx + 1} / {secKeys.length}
                  </span>
                </div>
              </div>

              {/* Field rows — single-field actions are untouched in behaviour,
                  but now pass comment through to the API call */}
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
                    onApprove={(_comment) => singleAction(field.fieldname, "Approved")}
                    onReject={(_comment) => singleAction(field.fieldname, "Rejected")}
                    onCommentChange={(val) =>
                      patchFieldState(field.fieldname, { comment: val })
                    }
                  />
                );
              })}
            </div>

            {/* Prev / Next navigation */}
            <div className="flex justify-between pt-1">
              <button
                onClick={goPrev}
                disabled={activeIdx <= 0}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>
              <button
                onClick={goNext}
                disabled={activeIdx >= secKeys.length - 1}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl text-xs font-medium border transition-all ${
            toast.type === "error"
              ? "bg-red-50 text-red-700 border-red-200"
              : toast.type === "info"
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}