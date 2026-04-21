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

const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: "http://localhost:8016",
  onboardingName: "HR-EMP-ONB-2026-00001",
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
  onApprove: () => void;
  onReject: () => void;
  onToggleComment: () => void;
  onCommentChange: (val: string) => void;
}

function FieldRow({
  field,
  state,
  checked,
  onCheck,
  onApprove,
  onReject,
  onToggleComment,
  onCommentChange,
}: FieldRowProps) {
  const val = displayValue(field.current_value);

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
          <p className="text-xs text-gray-500 mt-0.5 break-words leading-relaxed">{val}</p>
        ) : (
          <p className="text-xs text-gray-400 mt-0.5 italic">No value</p>
        )}
        {state.showComment && (
          <textarea
            rows={2}
            value={state.comment}
            onChange={(e) => onCommentChange(e.target.value)}
            placeholder="Add a comment..."
            className="mt-2 w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-700 resize-none outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 placeholder-gray-400"
          />
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
        <StatusBadge status={state.status} />

        <button
          onClick={onApprove}
          disabled={state.loading}
          title="Approve"
          className={`h-7 w-7 flex items-center justify-center rounded-lg border text-xs font-bold transition-all disabled:opacity-40 ${
            state.status === "Approved"
              ? "bg-emerald-500 text-white border-emerald-500"
              : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500"
          }`}
        >
          ✓
        </button>

        <button
          onClick={onReject}
          disabled={state.loading}
          title="Reject"
          className={`h-7 w-7 flex items-center justify-center rounded-lg border text-xs font-bold transition-all disabled:opacity-40 ${
            state.status === "Rejected"
              ? "bg-red-500 text-white border-red-500"
              : "bg-red-50 text-red-500 border-red-200 hover:bg-red-500 hover:text-white hover:border-red-500"
          }`}
        >
          ✗
        </button>

        <button
          onClick={onToggleComment}
          title="Toggle comment"
          className={`h-7 px-2 flex items-center justify-center rounded-lg border text-xs transition-all ${
            state.showComment
              ? "bg-blue-100 text-blue-600 border-blue-300"
              : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
          }`}
        >
          💬
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

// ─── OnboardingFieldApproval (Main Component) ─────────────────────────────────

export default function OnboardingFieldApproval() {
  // ── API config state ──
  const [config, setConfig] = useState<ApiConfig>(DEFAULT_CONFIG);
  const patchConfig = (patch: Partial<ApiConfig>) =>
    setConfig((prev) => ({ ...prev, ...patch }));

  // ── Selected fields state (multi-checkbox) ──
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const clearSelection = () => setSelectedFields(new Set());

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
                <button
                  onClick={() => sectionAction(activeSection, "Approved")}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                >
                  Approve section
                </button>
                <button
                  onClick={() => sectionAction(activeSection, "Rejected")}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                >
                  Reject section
                </button>
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

            {/* Bulk action bar */}
            {curSelected > 0 && (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex-wrap">
                <span className="text-xs text-blue-700 font-medium flex-1">
                  {curSelected} field{curSelected > 1 ? "s" : ""} selected
                </span>
                <button
                  onClick={() => {
                    const toUpdate = [...selectedFields].filter((fn) =>
                      curFields.some((f) => f.fieldname === fn)
                    );
                    bulkSelectedAction(toUpdate, "Approved").then(clearSelection);
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                >
                  Approve selected
                </button>
                <button
                  onClick={() => {
                    const toUpdate = [...selectedFields].filter((fn) =>
                      curFields.some((f) => f.fieldname === fn)
                    );
                    bulkSelectedAction(toUpdate, "Rejected").then(clearSelection);
                  }}
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
                    onReject={() => singleAction(field.fieldname, "Rejected")}
                    onToggleComment={() =>
                      patchFieldState(field.fieldname, { showComment: !state.showComment })
                    }
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