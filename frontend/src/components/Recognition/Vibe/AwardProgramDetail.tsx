import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
} from "lucide-react";
import { Typography } from "../../shared/atoms/Typography";
import Button from "../../shared/atoms/Button";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import FilterPanel, {
  type FilterField,
  type FilterValues,
} from "../../shared/molecules/FilterPanel";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import {
  useAwardProgramDetail,
  useNominationActions,
  type NominationAction,
  type NominationRow,
} from "../../../services/recognitionService";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const INITIAL_FILTERS: FilterValues = { status: "" };

/** Status pill for a nomination row (Published / Approved / Pending). */
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
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${tone}`}
    >
      {status || "—"}
    </span>
  );
};

/** One figure in the stats strip under the programme header. */
const Stat: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="px-2 py-1">
    <Typography variant="h2" className="text-2xl font-bold text-gray-900">
      {value}
    </Typography>
    <Typography variant="bodySmall" color="body2" className="block">
      {label}
    </Typography>
  </div>
);

const Meta: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="min-w-0">
    <Typography variant="bodySmall" color="body2" className="block mb-1">
      {label}
    </Typography>
    <div className="text-sm font-medium text-gray-800">{children}</div>
  </div>
);

const AwardProgramDetail: React.FC = () => {
  const navigate = useNavigate();
  // Route: /webapp/recognition/vibe/admin-dashboard/award/:program
  const { program = "" } = useParams<{ program: string }>();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<FilterValues>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Debounce the free-text search so we don't hit the API on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, filterValues, pageSize]);

  const { data, isLoading, isError, error } = useAwardProgramDetail({
    program: decodeURIComponent(program),
    search: debouncedQuery || undefined,
    status: (filterValues.status as string) || undefined,
    start: (page - 1) * pageSize,
    page_length: pageSize,
  });

  const prog = data?.program;
  const stats = data?.stats;
  const rows: NominationRow[] = data?.data ?? [];
  const totalRecords = data?.total_count ?? 0;

  const filterFields = useMemo<FilterField[]>(
    () => [
      {
        key: "status",
        label: "Status",
        type: "single",
        searchable: false,
        options: [
          { label: "All", value: "" },
          ...(data?.filter_options?.statuses ?? []).map((s) => ({
            label: s,
            value: s,
          })),
        ],
      },
    ],
    [data],
  );

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startRow = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(currentPage * pageSize, totalRecords);

  // Confirm dialog shared by shortlist / unshortlist / publish.
  const { shortlist, unshortlist, publish } = useNominationActions();
  const [confirm, setConfirm] = useState<{
    action: Exclude<NominationAction, "view">;
    row: NominationRow;
  } | null>(null);
  const [actionError, setActionError] = useState("");

  const CONFIRM_COPY: Record<
    Exclude<NominationAction, "view">,
    { title: string; body: string; cta: string }
  > = {
    shortlist: {
      title: "Shortlist Nomination",
      body: "Are you sure you want to Shortlist this Nomination?",
      cta: "SHORTLIST",
    },
    unshortlist: {
      title: "Unshortlist Nomination",
      body: "Are you sure you want to remove this Nomination from the shortlist?",
      cta: "UNSHORTLIST",
    },
    publish: {
      title: "Publish Nomination",
      body: "Are you sure you want to Publish this Nomination?",
      cta: "PUBLISH",
    },
  };

  const mutationFor = (action: Exclude<NominationAction, "view">) =>
    action === "shortlist" ? shortlist : action === "unshortlist" ? unshortlist : publish;

  const runConfirmed = async () => {
    if (!confirm) return;
    setActionError("");
    try {
      await mutationFor(confirm.action).mutateAsync(confirm.row.nomination_id);
      setConfirm(null);
    } catch (e) {
      setActionError((e as Error)?.message || "Action failed. Please try again.");
    }
  };

  const ACTION_LABEL: Record<Exclude<NominationAction, "view">, string> = {
    shortlist: "Shortlist",
    unshortlist: "Unshortlist",
    publish: "Publish",
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f6f7fb]">
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
          <ChevronRight className="size-3.5" />
          <span className="font-semibold text-gray-900">
            {prog?.title || decodeURIComponent(program)}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">
        {isError ? (
          <div className="rounded-xl border border-gray-100 bg-white p-10 text-center text-sm text-red-500">
            {(error as Error)?.message || "Failed to load program details."}
          </div>
        ) : (
          <>
            {/* ── Programme header ── */}
            <div className="mb-5 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <Typography variant="h2" className="text-lg font-bold md:text-xl">
                  {isLoading
                    ? "Loading…"
                    : `${prog?.title ?? ""} - Code ${prog?.code ?? ""}`}
                </Typography>
                {prog && (
                  <div className="flex shrink-0 flex-wrap gap-5 text-sm">
                    <span className="text-gray-500">
                      Start Date:{" "}
                      <b className="text-gray-900">
                        {prog.start_date ? formatToIndianDate(prog.start_date) : "—"}
                      </b>
                    </span>
                    <span className="text-gray-500">
                      End Date:{" "}
                      <b className="text-gray-900">
                        {prog.end_date ? formatToIndianDate(prog.end_date) : "—"}
                      </b>
                    </span>
                  </div>
                )}
              </div>

              {prog && (
                <>
                  <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <Meta label="Recognizer Roles">
                      {prog.recognizer_roles.length > 0
                        ? prog.recognizer_roles.join(", ")
                        : "—"}
                    </Meta>
                    <Meta label="Reward Type">{prog.reward_type || "—"}</Meta>
                    <Meta label="Award Type">{prog.award_type || "—"}</Meta>
                  </div>

                  <div className="mt-4">
                    <Typography variant="bodySmall" color="body2" className="block mb-1">
                      Program Description
                    </Typography>
                    <p className="max-w-3xl text-sm leading-relaxed text-gray-700">
                      {prog.description || "—"}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* ── Stats strip ── */}
            {stats && (
              <div className="mb-5 grid grid-cols-2 gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:grid-cols-3 lg:grid-cols-6">
                <Stat value={stats.max_nominations} label="Maximum Nominations" />
                <Stat value={stats.nominations_initiated} label="Nominations Initiated" />
                <Stat
                  value={stats.shortlisted}
                  label={
                    stats.max_shortlisted > 0
                      ? `Shortlisted (max ${stats.max_shortlisted})`
                      : "Shortlisted"
                  }
                />
                <Stat value={stats.max_recipients} label="Maximum Recipients" />
                <Stat
                  value={stats.initiators_submitted}
                  label="Initiators (Nomination Submitted)"
                />
                <Stat
                  value={stats.initiators_yet_to_nominate}
                  label="Initiators (Yet to Nominate)"
                />
              </div>
            )}

            {/* ── Nomination list ── */}
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search"
                    className="w-full rounded-lg border border-gray-200 py-1.5 pl-9 pr-3 text-sm text-gray-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFilterOpen(true)}
                  aria-label="Filter nominations"
                  className="self-end rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 sm:self-auto"
                >
                  <Filter className="size-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left">
                  <thead>
                    <tr className="bg-blue-50/40 text-sm text-gray-600">
                      <th className="px-5 py-3 font-semibold">Nomination ID</th>
                      <th className="px-5 py-3 font-semibold">Nominee</th>
                      <th className="px-5 py-3 font-semibold">Nomination Date</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Nomination Initiated By</th>
                      <th className="px-5 py-3 font-semibold">Nomination Note</th>
                      <th className="px-5 py-3 font-semibold">Last Action Date</th>
                      <th className="px-5 py-3 font-semibold">Panel Selected</th>
                      <th className="px-5 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-12 text-center text-sm text-gray-400">
                          Loading nominations…
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-10 text-center text-sm text-gray-400">
                          No nominations found.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr
                          key={row.nomination_id}
                          className="border-t border-gray-100 hover:bg-gray-50/60"
                        >
                          <td className="px-5 py-4 text-sm font-medium text-gray-800">
                            {row.nomination_id}
                          </td>
                          <td className="px-5 py-4 text-sm text-blue-600">
                            <WrapperHoverCard employeeId={row.nominee_id}>
                              <span className="cursor-pointer">{row.nominee}</span>
                            </WrapperHoverCard>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-700">
                            {row.nomination_date || "—"}
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-700">
                            <WrapperHoverCard employeeId={row.initiated_by_id}>
                              <span className="cursor-pointer">{row.initiated_by}</span>
                            </WrapperHoverCard>
                          </td>
                          <td className="px-5 py-4 max-w-[220px] truncate text-sm text-gray-700">
                            {row.note || "—"}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-700">
                            {row.last_action_date || "—"}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-700">
                            {row.panel_selected}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  navigate(
                                    `/webapp/recognition/vibe/admin-dashboard/award/${encodeURIComponent(
                                      decodeURIComponent(program),
                                    )}/nomination/${encodeURIComponent(row.nomination_id)}`,
                                  )
                                }
                              >
                                View Details
                              </Button>
                              {(row.actions ?? [])
                                .filter((a): a is Exclude<NominationAction, "view"> => a !== "view")
                                .map((a) => (
                                  <Button
                                    key={a}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setActionError("");
                                      setConfirm({ action: a, row });
                                    }}
                                  >
                                    {ACTION_LABEL[a]}
                                  </Button>
                                ))}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer / pagination */}
              <div className="flex flex-col gap-3 px-5 py-3 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {startRow} - {endRow} of {totalRecords} Records
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="rounded-md border border-gray-200 p-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <span className="flex size-7 items-center justify-center rounded-md bg-gray-100 font-medium text-gray-700">
                    {currentPage}
                  </span>
                  <span className="text-xs text-gray-400">of {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="rounded-md border border-gray-200 p-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="rounded-md border border-gray-200 px-2 py-1 text-gray-700 outline-none focus:border-primary"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <span>per page</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <FilterPanel
        open={filterOpen}
        fields={filterFields}
        values={filterValues}
        onClose={() => setFilterOpen(false)}
        onApply={setFilterValues}
      />

      {/* Confirm dialog for shortlist / unshortlist / publish */}
      {confirm && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirm(null)} />
          <div className="relative w-[calc(100%-2rem)] max-w-lg rounded-lg bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-semibold text-[#e2622b]">
              {CONFIRM_COPY[confirm.action].title}
            </h2>
            <p className="text-sm text-gray-700">{CONFIRM_COPY[confirm.action].body}</p>
            {actionError && (
              <p className="mt-3 text-sm text-red-600">{actionError}</p>
            )}
            <div className="mt-7 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="rounded border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={runConfirmed}
                disabled={mutationFor(confirm.action).isPending}
                className="rounded bg-[#e2622b] px-5 py-2 text-sm font-semibold text-white hover:bg-[#cf5721] disabled:opacity-60"
              >
                {mutationFor(confirm.action).isPending
                  ? "Working…"
                  : CONFIRM_COPY[confirm.action].cta}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AwardProgramDetail;
