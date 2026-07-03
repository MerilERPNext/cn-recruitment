/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../../shared/atoms/Card";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  FileText,
  Filter,
  Search,
  Settings2,
} from "lucide-react";
import FilterPanel, {
  type DateRange,
  type FilterField,
  type FilterValues,
} from "../../shared/molecules/FilterPanel";
import SettingsPanel, {
  type SettingsColumn,
  type TableSettings,
} from "../../shared/molecules/SettingsPanel";
import { useCurrentEmployeeDetails } from "../../../hooks/useEmployee";
import {
  useAwardNominations,
  useDoctypeOptions,
  useSetNominationPublished,
  type AwardNominationCategory,
  type AwardNominationRow,
} from "../../../services/recognitionService";
import RecognitionRowActions from "../components/RecognitionRowActions";

const PILLS: { label: string; category: AwardNominationCategory }[] = [
  { label: "INDIVIDUAL AWARDS RECEIVED", category: "individual_received" },
  { label: "INDIVIDUAL AWARDS RAISED", category: "individual_raised" },
  { label: "TEAM AWARDS RAISED", category: "team_raised" },
];

// Toggleable columns for the Settings drawer (data-row keys).
const NOMINATION_COLUMNS: SettingsColumn[] = [
  { key: "id", label: "Nomination ID" },
  { key: "program", label: "Nomination Program Names(ID)" },
  { key: "nominatedBy", label: "Nominated By" },
  { key: "nominationDate", label: "Nomination Date" },
  { key: "lastActionDate", label: "Last Action Date" },
  { key: "status", label: "Approval Status" },
  { key: "published", label: "Published" },
];

const INITIAL_TABLE_SETTINGS: TableSettings = {
  density: "comfort",
  visibleColumns: NOMINATION_COLUMNS.map((c) => c.key),
};

const INITIAL_FILTER_VALUES: FilterValues = {
  approvalStatus: "",
  nominationDate: { from: "", to: "" },
  lastActionDate: { from: "", to: "" },
  program: [],
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// Status badge palette by approval stage.
const statusStyle = (status: string): { wrap: string; dot: string } => {
  switch (status) {
    case "Approved":
      return { wrap: "bg-green-50 text-green-700", dot: "bg-green-500" };
    case "Rejected":
      return { wrap: "bg-red-50 text-red-700", dot: "bg-red-500" };
    case "Under Review":
      return { wrap: "bg-amber-50 text-amber-700", dot: "bg-amber-500" };
    case "Submitted":
      return { wrap: "bg-blue-50 text-blue-700", dot: "bg-blue-500" };
    default:
      return { wrap: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
  }
};

const AwardsNominationWorkflows: React.FC = () => {
  const { data: currentUser } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const employeeId = currentUser?.employee ?? "";

  const [activePill, setActivePill] = useState(0);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<FilterValues>(INITIAL_FILTER_VALUES);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tableSettings, setTableSettings] = useState<TableSettings>(INITIAL_TABLE_SETTINGS);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { mutateAsync: setPublished, isPending: isPublishing } =
    useSetNominationPublished();

  // Debounce the free-text search before it hits the API.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(id);
  }, [query]);

  // Reset to the first page whenever the tab / filters / search / size change.
  useEffect(() => {
    setPage(1);
  }, [activePill, filterValues, debouncedQuery, pageSize, sortDir]);

  // Drop the selection whenever the visible page of rows changes.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activePill, filterValues, debouncedQuery, pageSize, sortDir, page]);

  const category = PILLS[activePill].category;

  // All filtering, sorting and pagination are sent to the API as a payload.
  const nomRange = (filterValues.nominationDate as DateRange) || { from: "", to: "" };
  const actRange = (filterValues.lastActionDate as DateRange) || { from: "", to: "" };
  const apiParams = {
    employee: employeeId,
    category,
    search: debouncedQuery || undefined,
    status: (filterValues.approvalStatus as string) || undefined,
    programs: ((filterValues.program as string[]) || []).join(",") || undefined,
    nomination_from: nomRange.from || undefined,
    nomination_to: nomRange.to || undefined,
    action_from: actRange.from || undefined,
    action_to: actRange.to || undefined,
    sort_order: sortDir,
    start: (page - 1) * pageSize,
    page_length: pageSize,
  };

  const { data: response, isLoading } = useAwardNominations(apiParams);

  const counts = response?.counts;
  const statusOptions = response?.filter_options?.statuses ?? [];

  // Nomination Program → Employee Nomination.`award` is a Link → Award, so
  // options come from the Award doctype via the resource API. Label shows
  // "Award Name (ID)" to match the column; value = award id (the backend
  // matches nominations by award id).
  const { data: programOptions = [] } = useDoctypeOptions("Award", {
    labelTemplate: "{award_name} ({name})",
    orderBy: "award_name asc",
  });

  const filterFields = useMemo<FilterField[]>(
    () => [
      { key: "approvalStatus", label: "Approval Status", type: "single", options: statusOptions },
      { key: "nominationDate", label: "Nomination Date", type: "daterange" },
      { key: "lastActionDate", label: "Last Action Date", type: "daterange" },
      { key: "program", label: "Nomination Program Names(ID)", type: "multi", options: programOptions },
    ],
    [statusOptions, programOptions],
  );

  const pageRows: AwardNominationRow[] = response?.data ?? [];
  const total = response?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  const showCol = (key: string) => tableSettings.visibleColumns.includes(key);
  const rowPad =
    tableSettings.density === "compact"
      ? "py-2"
      : tableSettings.density === "expanded"
        ? "py-6"
        : "py-4";
  const colSpan = 2 + tableSettings.visibleColumns.length;

  // ─── Row selection + publish/draft actions ─────────────────────────────────
  const selectedCount = selectedIds.size;
  const allSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id));

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (pageRows.length > 0 && pageRows.every((r) => prev.has(r.id))) {
        return new Set();
      }
      return new Set(pageRows.map((r) => r.id));
    });
  };

  const applyPublished = async (published: boolean) => {
    if (selectedCount === 0 || isPublishing) return;
    try {
      await setPublished({ names: Array.from(selectedIds), published });
      setSelectedIds(new Set());
    } catch {
      // mutation surfaces the Frappe error toast; keep the selection so the
      // user can retry.
    }
  };

  return (
    <div className="p-4 md:p-6">
      {/* Filter pills */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {PILLS.map((pill, i) => (
          <button
            key={pill.label}
            onClick={() => setActivePill(i)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
              activePill === i
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {pill.label} {counts ? counts[pill.category] : 0}
          </button>
        ))}
      </div>

      <Card radius="xl" className="border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 p-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              aria-label="Filter nominations"
              className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
            >
              <Filter className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Table settings"
              className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
            >
              <Settings2 className="size-4" />
            </button>


          </div>
        </div>

        {/* Bulk publish / draft action bar — visible once any row is selected. */}
        {selectedCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-y border-primary/20 bg-primary/5 px-4 py-2.5">
            <span className="text-sm font-medium text-gray-700">
              {selectedCount} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => applyPublished(true)}
                disabled={isPublishing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
              >
                <CircleCheckBig className="size-3.5" />
                Publish
              </button>
              <button
                type="button"
                onClick={() => applyPublished(false)}
                disabled={isPublishing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <FileText className="size-3.5" />
                Move to Draft
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead>
              <tr className="text-sm text-gray-600 border-y border-gray-100">
                <th className="px-4 py-3 font-semibold">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    aria-label="Select all nominations on this page"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </th>
                {showCol("id") && <th className="px-4 py-3 font-semibold">Nomination ID</th>}
                {showCol("program") && (
                  <th className="px-4 py-3 font-semibold">Nomination Program Names(ID)</th>
                )}
                {showCol("nominatedBy") && (
                  <th className="px-4 py-3 font-semibold">Nominated By</th>
                )}
                {showCol("nominationDate") && (
                  <th className="px-4 py-3 font-semibold">
                    <button
                      onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                      className="flex items-center gap-1 hover:text-gray-800"
                    >
                      Nomination Date
                      {sortDir === "asc" ? (
                        <ArrowUp className="size-3.5" />
                      ) : (
                        <ArrowDown className="size-3.5" />
                      )}
                    </button>
                  </th>
                )}
                {showCol("lastActionDate") && (
                  <th className="px-4 py-3 font-semibold">Last Action Date</th>
                )}
                {showCol("status") && (
                  <th className="px-4 py-3 font-semibold">Approval Status</th>
                )}
                {showCol("published") && (
                  <th className="px-4 py-3 font-semibold">Published</th>
                )}
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-gray-400">
                    Loading nominations…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-gray-400">
                    No nominations found.
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => {
                  const s = statusStyle(row.status);
                  return (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/60">
                      <td className={`px-4 ${rowPad}`}>
                        <input
                          type="checkbox"
                          className="accent-primary"
                          aria-label={`Select nomination ${row.id}`}
                          checked={selectedIds.has(row.id)}
                          onChange={() => toggleRow(row.id)}
                        />
                      </td>
                      {showCol("id") && (
                        <td className={`px-4 ${rowPad} text-sm font-medium text-gray-800`}>
                          {row.id}
                        </td>
                      )}
                      {showCol("program") && (
                        <td
                          className={`px-4 ${rowPad} text-sm text-gray-700 max-w-[280px] truncate`}
                          title={row.program}
                        >
                          {row.program}
                        </td>
                      )}
                      {showCol("nominatedBy") && (
                        <td className={`px-4 ${rowPad} text-sm text-gray-700`}>
                          {row.nominatedBy}
                        </td>
                      )}
                      {showCol("nominationDate") && (
                        <td className={`px-4 ${rowPad} text-sm text-gray-700`}>
                          {row.nominationDate}
                        </td>
                      )}
                      {showCol("lastActionDate") && (
                        <td className={`px-4 ${rowPad} text-sm text-gray-700`}>
                          {row.lastActionDate}
                        </td>
                      )}
                      {showCol("status") && (
                        <td className={`px-4 ${rowPad}`}>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${s.wrap}`}
                          >
                            <span className={`size-1.5 rounded-full ${s.dot}`} />
                            {row.status}
                          </span>
                        </td>
                      )}
                      {showCol("published") && (
                        <td className={`px-4 ${rowPad}`}>
                          {row.published ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                              <CircleCheckBig className="size-3.5" />
                              Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                              <FileText className="size-3.5" />
                              Draft
                            </span>
                          )}
                        </td>
                      )}
                      <td className={`px-4 ${rowPad}`}>
                        <RecognitionRowActions
                          layout="icons"
                          actions={["view"]}
                          appreciation={false}
                          kind="nomination"
                          item={{
                            name: row.id,
                            title: row.program || row.id,
                            person: row.nominatedBy,
                            date: row.nominationDate,
                            status: row.status,
                          }}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center justify-between gap-3 px-5 py-3 text-sm text-gray-500 sm:flex-row">
          <span>
            {total === 0 ? "0" : `${start + 1} - ${Math.min(start + pageSize, total)}`} of {total}{" "}
            Records
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="rounded-md border border-gray-200 p-1.5 disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="flex size-7 items-center justify-center rounded-md bg-gray-100 font-medium text-gray-700">
              {safePage}
            </span>
            <span className="text-xs text-gray-400">of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="rounded-md border border-gray-200 p-1.5 disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-md border border-gray-200 px-2 py-1 outline-none focus:border-primary"
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
      </Card>

      <FilterPanel
        open={filterOpen}
        fields={filterFields}
        values={filterValues}
        onClose={() => setFilterOpen(false)}
        onApply={setFilterValues}
      />

      <SettingsPanel
        open={settingsOpen}
        columns={NOMINATION_COLUMNS}
        value={tableSettings}
        onClose={() => setSettingsOpen(false)}
        onApply={setTableSettings}
      />
    </div>
  );
};

export default AwardsNominationWorkflows;
