import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Pencil,
  Search,
  Settings2,
  ArrowUp,
  ArrowDown,
  Inbox,
} from "lucide-react";
import Button from "../../shared/atoms/Button";
import FilterPanel, {
  type DateRange,
  type FilterField,
  type FilterValues,
} from "../../shared/molecules/FilterPanel";
import SettingsPanel, {
  type SettingsColumn,
  type TableSettings,
} from "../../shared/molecules/SettingsPanel";

import {
  useRecognitionAdminDashboard,
  useDoctypeOptions,
  type RecognitionAdminParams,
} from "../../../services/recognitionService";
import CreateProgramModal from "./CreateProgramModal";

/* ────────────────────────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────────────────────────── */
interface AppreciationProgram {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface AwardProgram extends AppreciationProgram {
  awardType: string;
  nominations: "Open" | "Closed";
}

interface TeamRegistration {
  teamName: string;
  teamType: string;
  members: number;
  programName: string;
  createdBy: string;
  createdOn: string;
  status: string;
}

type TabKey = "appreciation" | "award" | "team";

// The query controls a server-driven DataTable emits to its parent.
interface TableQuery {
  search: string;
  sortKey: string | null;
  sortDir: "asc" | "desc";
  page: number;
  pageSize: number;
  filterValues: FilterValues;
}

const INITIAL_QUERY: TableQuery = {
  search: "",
  sortKey: null,
  sortDir: "asc",
  page: 1,
  pageSize: 10,
  filterValues: {},
};

/* ────────────────────────────────────────────────────────────────────────────
 * Small UI helpers
 * ──────────────────────────────────────────────────────────────────────────── */
const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    Active: "bg-green-50 text-green-700 border-green-200",
    Inactive: "bg-gray-100 text-gray-600 border-gray-200",
    Archived: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium ${
        map[status] || map.Inactive
      }`}
    >
      {status}
    </span>
  );
};

const StatCard = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col">
    <span className="text-2xl font-semibold text-gray-900">{value}</span>
    <span className="mt-0.5 text-xs text-gray-500">{label}</span>
  </div>
);



interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render: (row: T) => React.ReactNode;
  className?: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Generic server-driven table — search / filter / sort / pagination emit a
 * TableQuery to the parent, which fetches the matching rows from the API.
 * ──────────────────────────────────────────────────────────────────────────── */
function DataTable<T>({
  rows,
  total,
  loading,
  columns,
  filterFields = [],
  onQueryChange,
}: {
  rows: T[];
  total: number;
  loading?: boolean;
  columns: Column<T>[];
  filterFields?: FilterField[];
  onQueryChange: (q: TableQuery) => void;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<string | null>(columns[0]?.key ?? null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Toolbar drawers.
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Column visibility + density. "actions" is always shown (not toggleable).
  const toggleableColumns: SettingsColumn[] = useMemo(
    () =>
      columns
        .filter((c) => c.key !== "actions")
        .map((c) => ({ key: c.key, label: c.header })),
    [columns],
  );
  const [tableSettings, setTableSettings] = useState<TableSettings>({
    density: "comfort",
    visibleColumns: toggleableColumns.map((c) => c.key),
  });

  const renderColumns = columns.filter(
    (c) => c.key === "actions" || tableSettings.visibleColumns.includes(c.key),
  );
  const rowPad =
    tableSettings.density === "compact"
      ? "py-1.5"
      : tableSettings.density === "expanded"
        ? "py-5"
        : "py-3";

  // Debounce the free-text search before it hits the API.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  // Emit the query whenever any control changes; the parent fetches the page.
  useEffect(() => {
    onQueryChange({ search: debouncedSearch, sortKey, sortDir, page, pageSize, filterValues });
  }, [debouncedSearch, sortKey, sortDir, page, pageSize, filterValues, onQueryChange]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  // Keep the page within range when the result set shrinks.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const start = (safePage - 1) * pageSize;
  const pageRows = rows;

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const pageNumbers = useMemo(() => {
    const pages: (number | "…")[] = [];
    const max = 5;
    if (totalPages <= max + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      const lo = Math.max(2, safePage - 1);
      const hi = Math.min(totalPages - 1, safePage + 1);
      if (lo > 2) pages.push("…");
      for (let i = lo; i <= hi; i++) pages.push(i);
      if (hi < totalPages - 1) pages.push("…");
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safePage]);

  const gridCols = renderColumns.map((c) => c.className || "1fr").join(" ");

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 py-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search"
            className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-2">
          {filterFields.length > 0 && (
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              title="Filter"
              aria-label="Filter"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            >
              <Filter className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            title="Settings"
            aria-label="Settings"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            <Settings2 className="h-4 w-4" />
          </button>
   
        
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-gray-100">
        <div className="min-w-[760px]">
          {/* Header */}
          <div
            className="grid gap-4 border-b border-gray-100 bg-gray-50 px-5 py-3"
            style={{ gridTemplateColumns: gridCols }}
          >
            {renderColumns.map((col) => {
              const active = sortKey === col.key;
              return (
                <button
                  key={col.key}
                  disabled={!col.sortable}
                  onClick={() => col.sortable && toggleSort(col.key)}
                  className={`flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 ${
                    col.sortable ? "cursor-pointer hover:text-gray-700" : "cursor-default"
                  }`}
                >
                  {col.header}
                  {col.sortable &&
                    active &&
                    (sortDir === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    ))}
                </button>
              );
            })}
          </div>

          {/* Body */}
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
              <p className="text-sm">Loading…</p>
            </div>
          ) : pageRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
              <Inbox className="h-10 w-10" />
              <p className="text-sm">There are no records to display</p>
            </div>
          ) : (
            pageRows.map((row, idx) => (
              <div
                key={idx}
                className={`grid items-center gap-4 border-b border-gray-50 px-5 ${rowPad} text-sm text-gray-700 last:border-b-0 hover:bg-gray-50/60`}
                style={{ gridTemplateColumns: gridCols }}
              >
                {renderColumns.map((col) => (
                  <div key={col.key} className="min-w-0 truncate">
                    {col.render(row)}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer / pagination */}
      <div className="flex flex-col items-center justify-between gap-3 py-3 text-sm text-gray-500 sm:flex-row">
        <span>
          {total === 0
            ? "0 Records"
            : `${start + 1}-${Math.min(start + pageSize, total)} of ${total} Records`}
        </span>

        <div className="flex items-center gap-1">
          <button
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageNumbers.map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} className="px-2 text-gray-400">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`flex h-8 min-w-8 items-center justify-center rounded-md border px-2 ${
                  p === safePage
                    ? "border-primary bg-primary text-white"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            ),
          )}
          <button
            disabled={safePage >= totalPages}
            onClick={() => setPage(safePage + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-600 focus:outline-none"
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span>per page</span>
        </div>
      </div>

      {filterFields.length > 0 && (
        <FilterPanel
          open={filterOpen}
          fields={filterFields}
          values={filterValues}
          onClose={() => setFilterOpen(false)}
          onApply={(v) => {
            setFilterValues(v);
            setPage(1);
          }}
        />
      )}

      <SettingsPanel
        open={settingsOpen}
        columns={toggleableColumns}
        value={tableSettings}
        onClose={() => setSettingsOpen(false)}
        onApply={setTableSettings}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Tabs
 * ──────────────────────────────────────────────────────────────────────────── */
const TABS: { key: TabKey; label: string }[] = [
  { key: "appreciation", label: "APPRECIATION PROGRAMS" },
  { key: "award", label: "AWARD PROGRAMS" },
  { key: "team", label: "TEAM REGISTRATIONS" },
];

const StatRow = ({ stats }: { stats: { value: number; label: string }[] }) => (
  <div className="grid grid-cols-2 gap-4 border-b border-gray-100 py-5 sm:grid-cols-4 lg:grid-cols-5">
    {stats.map((s) => (
      <StatCard key={s.label} value={s.value} label={s.label} />
    ))}
  </div>
);

/* ────────────────────────────────────────────────────────────────────────────
 * Page
 * ──────────────────────────────────────────────────────────────────────────── */
export default function RecognitionAdminDashboard() {
  const [tab, setTab] = useState<TabKey>("appreciation");
  const [query, setQuery] = useState<TableQuery>(INITIAL_QUERY);
  const [modalOpen, setModalOpen] = useState(false);
  const [editCode, setEditCode] = useState<string | null>(null);

  const openCreate = () => {
    setEditCode(null);
    setModalOpen(true);
  };
  const openEdit = (code: string) => {
    setEditCode(code);
    setModalOpen(true);
  };

  const onQueryChange = useCallback((q: TableQuery) => setQuery(q), []);

  const changeTab = (t: TabKey) => {
    if (t === tab) return;
    setQuery(INITIAL_QUERY);
    setTab(t);
  };

  // Map the table query + tab → API params (filtering happens server-side).
  const params = useMemo<RecognitionAdminParams>(() => {
    const fv = query.filterValues;
    const names = (fv.name as string[]) || [];
    const startRange = (fv.startDate as DateRange) || { from: "", to: "" };
    const endRange = (fv.endDate as DateRange) || { from: "", to: "" };
    return {
      tab,
      search: query.search || undefined,
      status: (fv.status as string) || undefined,
      award_type: (fv.awardType as string) || undefined,
      names: names.join(",") || undefined,
      start_from: startRange.from || undefined,
      start_to: startRange.to || undefined,
      end_from: endRange.from || undefined,
      end_to: endRange.to || undefined,
      sort_field: query.sortKey || undefined,
      sort_order: query.sortDir,
      start: (query.page - 1) * query.pageSize,
      page_length: query.pageSize,
    };
  }, [tab, query]);

  const { data, isLoading } = useRecognitionAdminDashboard(params);
  const rows = data?.data ?? [];
  const total = data?.total_count ?? 0;
  const stats = data?.stats ?? [];
  const statusOptions = data?.filter_options?.statuses ?? [];
  const awardTypeOptions = data?.filter_options?.award_types ?? [];

  // Program Name filter → Recognition Program doctype (Link) via the resource
  // API, scoped to each tab's program type. Value = program_name (matches the
  // backend `names` filter). Status / Award Type stay as Select-derived enums.
  const { data: appreciationNameOptions = [] } = useDoctypeOptions("Recognition Program", {
    labelField: "program_name",
    valueField: "program_name",
    filters: [["program_type", "=", "Appreciation"]],
    orderBy: "program_name asc",
  });
  const { data: awardNameOptions = [] } = useDoctypeOptions("Recognition Program", {
    labelField: "program_name",
    valueField: "program_name",
    filters: [["program_type", "=", "Award"]],
    orderBy: "program_name asc",
  });

  const appreciationFilters: FilterField[] = [
    { key: "status", label: "Status", type: "single", options: statusOptions },
    { key: "name", label: "Program Name", type: "multi", options: appreciationNameOptions },
    { key: "startDate", label: "Program Start Date", type: "daterange" },
    { key: "endDate", label: "Program End Date", type: "daterange" },
  ];
  const awardFilters: FilterField[] = [
    { key: "status", label: "Status", type: "single", options: statusOptions },
    { key: "awardType", label: "Award Type", type: "single", options: awardTypeOptions },
    { key: "name", label: "Program Name", type: "multi", options: awardNameOptions },
    { key: "startDate", label: "Award Start Date", type: "daterange" },
    { key: "endDate", label: "Award End Date", type: "daterange" },
  ];

  return (
    <div className="flex h-full flex-col bg-app font-brand">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-gray-100 bg-white px-6 py-5  sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-bold tracking-tight text-gray-900">
          Recognition Admin Dashboard
        </h1>
        <Button variant="outline" size="sm" onClick={openCreate}>
          CREATE NEW PROGRAM
        </Button>
      </div>

      <CreateProgramModal
        open={modalOpen}
        editCode={editCode}
        onClose={() => setModalOpen(false)}
      />

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-100 bg-white px-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => changeTab(t.key)}
            className={`relative py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${
              tab === t.key ? "text-primary" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-lg bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 pb-10">
        {tab !== "team" && <StatRow stats={stats} />}

        {tab === "appreciation" && (
          <DataTable<AppreciationProgram>
            key="appreciation"
            rows={rows as AppreciationProgram[]}
            total={total}
            loading={isLoading}
            onQueryChange={onQueryChange}
            filterFields={appreciationFilters}
            columns={[
              {
                key: "code",
                header: "Program Code",
                sortable: true,
                className: "1.3fr",
                render: (r) => <span className="font-medium text-gray-900">{r.code}</span>,
              },
              { key: "name", header: "Program Name", sortable: true, className: "1.5fr", render: (r) => r.name },
              { key: "start", header: "Program Start Date", sortable: true, className: "1fr", render: (r) => r.startDate },
              { key: "end", header: "Program End Date", sortable: true, className: "1fr", render: (r) => r.endDate },
              { key: "status", header: "Status", className: "0.8fr", render: (r) => <StatusPill status={r.status} /> },
              {
                key: "actions",
                header: "Actions",
                className: "0.6fr",
                render: (r) => (
                  <button
                    title="Edit"
                    onClick={() => openEdit(r.code)}
                    className="text-primary hover:text-primary/80"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                ),
              },
            ]}
          />
        )}

        {tab === "award" && (
          <DataTable<AwardProgram>
            key="award"
            rows={rows as AwardProgram[]}
            total={total}
            loading={isLoading}
            onQueryChange={onQueryChange}
            filterFields={awardFilters}
            columns={[
              {
                key: "code",
                header: "Program Code",
                sortable: true,
                className: "1.2fr",
                render: (r) => <span className="font-medium text-gray-900">{r.code}</span>,
              },
              { key: "name", header: "Program Name", sortable: true, className: "1.8fr", render: (r) => r.name },
              { key: "awardType", header: "Award Type", sortable: true, className: "0.9fr", render: (r) => r.awardType },
              { key: "start", header: "Award Start Date", sortable: true, className: "1fr", render: (r) => r.startDate },
              { key: "end", header: "Award End Date", sortable: true, className: "1fr", render: (r) => r.endDate },
              { key: "status", header: "Status", className: "0.7fr", render: (r) => <StatusPill status={r.status} /> },
              {
                key: "actions",
                header: "Actions",
                className: "1.3fr",
                render: (r) => (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(r.code)}>
                      View Details
                    </Button>
                    <button
                      title="Edit"
                      onClick={() => openEdit(r.code)}
                      className="text-primary hover:text-primary/80"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        )}

        {tab === "team" && (
          <div className="pt-4">
            <DataTable<TeamRegistration>
              key="team"
              rows={rows as TeamRegistration[]}
              total={total}
              loading={isLoading}
              onQueryChange={onQueryChange}
              columns={[
                { key: "teamName", header: "Team Name", sortable: true, className: "1.2fr", render: (r) => r.teamName },
                { key: "teamType", header: "Team type", sortable: true, className: "1fr", render: (r) => r.teamType },
                { key: "members", header: "Number of Team Members", className: "1.2fr", render: (r) => r.members },
                { key: "programName", header: "Program Name", sortable: true, className: "1.2fr", render: (r) => r.programName },
                { key: "createdBy", header: "Created by", className: "1fr", render: (r) => r.createdBy },
                { key: "createdOn", header: "Created On", sortable: true, className: "1fr", render: (r) => r.createdOn },
                { key: "status", header: "Status", className: "0.8fr", render: (r) => <StatusPill status={r.status} /> },
                {
                  key: "actions",
                  header: "Actions",
                  className: "0.7fr",
                  render: () => (
                    <button title="Edit" className="text-primary hover:text-primary/80">
                      <Pencil className="h-4 w-4" />
                    </button>
                  ),
                },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
