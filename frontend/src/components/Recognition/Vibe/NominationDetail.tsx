import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Typography } from "../../shared/atoms/Typography";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import { useNominationDetail } from "../../../services/recognitionService";

/** Same badge tones as the nomination list, so a row and its page agree. */
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = (status || "").toLowerCase();
  const tone =
    s === "published" || s === "approved"
      ? "bg-emerald-50 text-emerald-700"
      : s === "shortlisted"
        ? "bg-slate-100 text-slate-700"
        : s === "rejected"
          ? "bg-red-50 text-red-700"
          : "bg-amber-50 text-amber-700";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase whitespace-nowrap ${tone}`}
    >
      {status || "—"}
    </span>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="min-w-0">
    <Typography variant="bodySmall" color="body2" className="mb-1 block">
      {label}
    </Typography>
    <div className="text-sm font-medium text-gray-900">{children}</div>
  </div>
);

const NominationDetail: React.FC = () => {
  const navigate = useNavigate();
  // Route: .../admin-dashboard/award/:program/nomination/:name
  const { program = "", name = "" } = useParams<{ program: string; name: string }>();

  const { data, isLoading, isError, error } = useNominationDetail(
    decodeURIComponent(name),
  );

  const n = data?.nomination;
  const customForm = data?.custom_form ?? [];
  const stages = data?.approval_stages ?? [];

  const back = () =>
    navigate(
      `/webapp/recognition/vibe/admin-dashboard/award/${encodeURIComponent(
        decodeURIComponent(program),
      )}`,
    );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-app">
      {/* Breadcrumb */}
      <div className="border-b border-gray-200 bg-white px-4 py-3 md:px-6">
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <button
            type="button"
            onClick={() => navigate("/webapp/recognition/vibe/admin-dashboard")}
            className="hover:text-primary"
          >
            Award Programs
          </button>
          <span>›</span>
          <button type="button" onClick={back} className="hover:text-primary">
            {n?.program_title || decodeURIComponent(program)}
          </button>
          <span>›</span>
          <span className="font-semibold text-gray-900">
            {n?.name || decodeURIComponent(name)}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">
        <button
          type="button"
          onClick={back}
          aria-label="Back to nominations"
          className="mb-4 flex size-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
        >
          <ArrowLeft className="size-4" />
        </button>

        {isError ? (
          <div className="rounded-xl border border-gray-100 bg-white p-10 text-center text-sm text-red-500">
            {(error as Error)?.message || "Failed to load nomination."}
          </div>
        ) : isLoading ? (
          <div className="rounded-xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-400">
            Loading nomination…
          </div>
        ) : (
          <>
            {/* ── Header ── */}
            <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50/70 p-5">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <Field label="Nominee name">
                  <WrapperHoverCard employeeId={n?.nominee_id}>
                    <span className="cursor-pointer">{n?.nominee || "—"}</span>
                  </WrapperHoverCard>
                </Field>
                <Field label="Nominator name">
                  <WrapperHoverCard employeeId={n?.nominator_id}>
                    <span className="cursor-pointer">{n?.nominator || "—"}</span>
                  </WrapperHoverCard>
                </Field>
                <Field label="Program name">{n?.program_title || "—"}</Field>
                <Field label="Initiated on">{n?.initiated_on || "—"}</Field>
                <Field label="Latest Action Date">{n?.last_action_date || "—"}</Field>
                <Field label="Status">
                  <StatusBadge status={n?.status || ""} />
                </Field>
              </div>

              <div className="mt-5">
                <Typography variant="bodySmall" color="body2" className="mb-1 block">
                  Nomination Note
                </Typography>
                <p className="max-w-4xl text-sm leading-relaxed text-gray-800">
                  {n?.note || "—"}
                </p>
              </div>

              {(n?.values?.length ?? 0) > 0 && (
                <div className="mt-4">
                  <Typography variant="bodySmall" color="body2" className="mb-1 block">
                    Values
                  </Typography>
                  <div className="flex flex-wrap gap-1.5">
                    {n?.values.map((v) => (
                      <span
                        key={v}
                        className="rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-600"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Nomination Custom Form ── */}
            <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <Typography variant="h2" className="mb-5 text-base font-semibold">
                Nomination Custom Form
              </Typography>

              {customForm.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">
                  {data?.custom_form_name
                    ? "This nomination has no custom form answers."
                    : "No custom form is attached to this program."}
                </p>
              ) : (
                <div className="max-w-2xl space-y-5 pl-1 sm:pl-6">
                  {customForm.map((f) => (
                    <div key={f.key}>
                      <label className="mb-1.5 block text-sm text-gray-600">
                        {f.label}
                      </label>
                      <div className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800">
                        {f.value || "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Approval stages ── */}
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead>
                    <tr className="bg-gray-100 border border-gray-100 text-sm text-gray-600">
                      <th className="px-5 py-3 font-semibold">Stage Name</th>
                      <th className="px-5 py-3 font-semibold">Assigned To</th>
                      <th className="px-5 py-3 font-semibold">Action Taken By</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Actual Trigger Date</th>
                      <th className="px-5 py-3 font-semibold">Due Date</th>
                      <th className="px-5 py-3 font-semibold">Completed Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stages.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-5 py-10 text-center text-sm text-gray-400"
                        >
                          No approval stages configured for this program.
                        </td>
                      </tr>
                    ) : (
                      stages.map((st, i) => (
                        <tr
                          key={`${st.stage_name}-${i}`}
                          className="border-t border-gray-100 hover:bg-gray-50/60"
                        >
                          <td className="px-5 py-4 text-sm font-medium text-gray-800">
                            {st.stage_name}
                          </td>
                          <td className="px-5 py-4 text-sm text-blue-600">
                            {st.assigned_to}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-700">
                            {st.action_taken_by}
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge status={st.status} />
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-700">
                            {st.actual_trigger_date || "—"}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-700">
                            {st.due_date || "—"}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-700">
                            {st.completed_date || "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NominationDetail;
