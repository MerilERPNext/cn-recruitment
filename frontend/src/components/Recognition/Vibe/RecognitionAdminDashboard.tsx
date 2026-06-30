import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
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
import SavedViewsMenu from "../../shared/molecules/SavedViewsMenu";

// Distinct option list helper.
const distinctOptions = (values: string[]) =>
  Array.from(new Set(values)).map((v) => ({ label: v, value: v }));

// Is a "DD-MM-YYYY" date within a {from,to} (yyyy-mm-dd) range? Empty bounds pass.
const inDateRange = (dmy: string, range?: DateRange) => {
  if (!range || (!range.from && !range.to)) return true;
  const [d, m, y] = (dmy || "").split("-");
  if (!d || !m || !y) return true;
  const iso = `${y}-${m}-${d}`;
  if (range.from && iso < range.from) return false;
  if (range.to && iso > range.to) return false;
  return true;
};

/* ────────────────────────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────────────────────────── */
type Status = "Active" | "Inactive" | "Archived";
type AwardStatus = "Active" | "Inactive" | "Archived";

interface AppreciationProgram {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: Status;
}

interface AwardProgram {
  code: string;
  name: string;
  awardType: string;
  startDate: string;
  endDate: string;
  status: AwardStatus;
  nominations: "Open" | "Closed";
}

interface TeamRegistration {
  teamName: string;
  teamType: string;
  members: number;
  programName: string;
  createdBy: string;
  createdOn: string;
  status: Status;
}

type TabKey = "appreciation" | "award" | "team";

/* ────────────────────────────────────────────────────────────────────────────
 * Dummy data
 * ──────────────────────────────────────────────────────────────────────────── */
const APPRECIATION_PROGRAMS: AppreciationProgram[] = [
  { code: "2022-PW-02", name: "Smiley Award", startDate: "01-01-2022", endDate: "31-12-2023", status: "Inactive" },
  { code: "2022-OOB-PW", name: "Out of box", startDate: "01-01-2022", endDate: "31-12-2023", status: "Inactive" },
  { code: "2022-POB-PW", name: "Pat on the Back", startDate: "01-01-2022", endDate: "31-12-2023", status: "Inactive" },
  { code: "2022-PW-03", name: "Best Buddy", startDate: "01-01-2022", endDate: "31-12-2023", status: "Inactive" },
  { code: "2022-TY-PW", name: "Thank you", startDate: "01-01-2022", endDate: "31-12-2023", status: "Inactive" },
  { code: "2025-POB-PW", name: "Pat on the Back", startDate: "09-04-2025", endDate: "31-03-2026", status: "Inactive" },
  { code: "2025-PW-03", name: "Best Buddy", startDate: "24-03-2025", endDate: "31-03-2026", status: "Inactive" },
  { code: "2025-Smile-PW", name: "Smiley Award", startDate: "22-07-2025", endDate: "31-03-2026", status: "Inactive" },
  { code: "2026-TY-PW", name: "Thank You", startDate: "12-01-2026", endDate: "31-03-2026", status: "Inactive" },
  { code: "Great Team work", name: "Great Team work", startDate: "17-02-2026", endDate: "17-02-2026", status: "Active" },
  { code: "2026-OOB-PW", name: "Out of box", startDate: "01-02-2026", endDate: "31-03-2026", status: "Inactive" },
  { code: "2026-POB-PW", name: "Pat on the Back", startDate: "01-02-2026", endDate: "31-03-2026", status: "Inactive" },
];

const AWARD_PROGRAMS: AwardProgram[] = [
  { code: "2022-BesC-PW", name: "Best Counsellor", awardType: "Individual", startDate: "01-01-2023", endDate: "20-01-2023", status: "Active", nominations: "Closed" },
  { code: "2022-BestM-PW", name: "Best Marketing", awardType: "Individual", startDate: "01-01-2023", endDate: "10-01-2023", status: "Active", nominations: "Closed" },
  { code: "2022-BFacM-PW", name: "Best of Best Admin's", awardType: "Individual", startDate: "01-01-2023", endDate: "20-01-2023", status: "Active", nominations: "Closed" },
  { code: "2022-BOPE-PW", name: "Batch Ops Excellence Award", awardType: "Individual", startDate: "01-01-2023", endDate: "20-01-2023", status: "Active", nominations: "Closed" },
  { code: "2022-BStuA-PW", name: "Best Student Angel", awardType: "Individual", startDate: "01-01-2023", endDate: "20-01-2023", status: "Active", nominations: "Closed" },
  { code: "2022-BTAC-PW", name: "Best Talent Acquisition", awardType: "Individual", startDate: "01-01-2023", endDate: "28-01-2023", status: "Active", nominations: "Closed" },
  { code: "2022-BugF-PW", name: "Bug Identifier", awardType: "Individual", startDate: "01-01-2023", endDate: "20-01-2023", status: "Active", nominations: "Closed" },
  { code: "2022-CA-PW", name: "Performer of the Quarter Coach-Acad", awardType: "Individual", startDate: "01-01-2023", endDate: "20-01-2023", status: "Active", nominations: "Closed" },
  { code: "2022-CoC-PW", name: "Clean coder", awardType: "Individual", startDate: "01-01-2023", endDate: "20-01-2023", status: "Active", nominations: "Closed" },
  { code: "2022-DEC1-PW", name: "Star performer of the Month DEC 2022", awardType: "Individual", startDate: "01-01-2023", endDate: "31-01-2023", status: "Active", nominations: "Open" },
  { code: "2026-TEAM-PW", name: "Best Team of the Year", awardType: "Team", startDate: "01-01-2026", endDate: "31-12-2026", status: "Active", nominations: "Open" },
  { code: "2026-INNOV-PW", name: "Innovation Champion", awardType: "Individual", startDate: "01-01-2026", endDate: "31-12-2026", status: "Active", nominations: "Open" },
];

const TEAM_REGISTRATIONS: TeamRegistration[] = [];

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

const ToolbarIcon = ({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) => (
  <button
    title={label}
    aria-label={label}
    className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
  >
    {icon}
  </button>
);

interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Generic table (search + sort + pagination) — shared by all tabs
 * ──────────────────────────────────────────────────────────────────────────── */
function DataTable<T>({
  rows,
  columns,
  searchableText,
  filterFields = [],
  filterPredicate,
}: {
  rows: T[];
  columns: Column<T>[];
  searchableText: (row: T) => string;
  /** Optional Filter-drawer fields. When empty the filter button is hidden. */
  filterFields?: FilterField[];
  /** Row predicate against the applied filter values. */
  filterPredicate?: (row: T, values: FilterValues) => boolean;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<string | null>(columns[0]?.key ?? null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Toolbar drawers.
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savedViewsOpen, setSavedViewsOpen] = useState(false);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let data = q
      ? rows.filter((r) => searchableText(r).toLowerCase().includes(q))
      : [...rows];

    if (filterPredicate) {
      data = data.filter((r) => filterPredicate(r, filterValues));
    }

    const col = columns.find((c) => c.key === sortKey);
    if (col?.sortValue) {
      data = [...data].sort((a, b) => {
        const av = col.sortValue!(a);
        const bv = col.sortValue!(b);
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [rows, search, sortKey, sortDir, columns, searchableText, filterPredicate, filterValues]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

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
          <div className="relative">
            <button
              type="button"
              onClick={() => setSavedViewsOpen((o) => !o)}
              title="Saved views"
              aria-label="Saved views"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            >
              <Eye className="h-4 w-4" />
            </button>
            <SavedViewsMenu
              open={savedViewsOpen}
              onClose={() => setSavedViewsOpen(false)}
              count={0}
              canUpdate={false}
            />
          </div>
          <ToolbarIcon icon={<Download className="h-4 w-4" />} label="Export" />
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
          {pageRows.length === 0 ? (
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

  // Appreciation stats
  const apprStats = useMemo(() => {
    const total = APPRECIATION_PROGRAMS.length;
    const active = APPRECIATION_PROGRAMS.filter((p) => p.status === "Active").length;
    const inactive = APPRECIATION_PROGRAMS.filter((p) => p.status === "Inactive").length;
    const archived = APPRECIATION_PROGRAMS.filter((p) => p.status === "Archived").length;
    return [
      { value: total, label: "Total Programs" },
      { value: active, label: "Active Programs" },
      { value: inactive, label: "Inactive Programs" },
      { value: archived, label: "Archived Programs" },
    ];
  }, []);

  // Award stats
  const awardStats = useMemo(() => {
    const total = AWARD_PROGRAMS.length;
    const open = AWARD_PROGRAMS.filter((p) => p.status === "Active" && p.nominations === "Open").length;
    const closed = AWARD_PROGRAMS.filter((p) => p.status === "Active" && p.nominations === "Closed").length;
    const inactive = AWARD_PROGRAMS.filter((p) => p.status === "Inactive").length;
    const archived = AWARD_PROGRAMS.filter((p) => p.status === "Archived").length;
    return [
      { value: total, label: "Total Programs" },
      { value: open, label: "Active Programs - Nominations Open" },
      { value: closed, label: "Active Programs - Nominations Closed" },
      { value: inactive, label: "Inactive Programs" },
      { value: archived, label: "Archived Programs" },
    ];
  }, []);

  return (
    <div className="flex h-full flex-col bg-app font-brand">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-gray-100 bg-white px-6 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-bold tracking-tight text-gray-900">
          Recognition Admin Dashboard
        </h1>
        <Button variant="outline" size="md" onClick={() => {}}>
          CREATE NEW PROGRAM
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-100 bg-white px-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${
              tab === t.key
                ? "text-primary"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 pb-10">
        {tab === "appreciation" && (
          <>
            <StatRow stats={apprStats} />
            <DataTable<AppreciationProgram>
              rows={APPRECIATION_PROGRAMS}
              searchableText={(r) => `${r.code} ${r.name} ${r.status}`}
              filterFields={[
                { key: "status", label: "Status", type: "single", options: distinctOptions(APPRECIATION_PROGRAMS.map((p) => p.status)) },
                { key: "name", label: "Program Name", type: "multi", options: distinctOptions(APPRECIATION_PROGRAMS.map((p) => p.name)) },
                { key: "startDate", label: "Program Start Date", type: "daterange" },
                { key: "endDate", label: "Program End Date", type: "daterange" },
              ]}
              filterPredicate={(r, v) => {
                const names = (v.name as string[]) || [];
                return (
                  (!v.status || r.status === v.status) &&
                  (names.length === 0 || names.includes(r.name)) &&
                  inDateRange(r.startDate, v.startDate as DateRange) &&
                  inDateRange(r.endDate, v.endDate as DateRange)
                );
              }}
              columns={[
                {
                  key: "code",
                  header: "Program Code",
                  sortable: true,
                  className: "1.3fr",
                  sortValue: (r) => r.code,
                  render: (r) => <span className="font-medium text-gray-900">{r.code}</span>,
                },
                {
                  key: "name",
                  header: "Program Name",
                  sortable: true,
                  className: "1.5fr",
                  sortValue: (r) => r.name,
                  render: (r) => r.name,
                },
                {
                  key: "start",
                  header: "Program Start Date",
                  sortable: true,
                  className: "1fr",
                  sortValue: (r) => r.startDate.split("-").reverse().join("-"),
                  render: (r) => r.startDate,
                },
                {
                  key: "end",
                  header: "Program End Date",
                  sortable: true,
                  className: "1fr",
                  sortValue: (r) => r.endDate.split("-").reverse().join("-"),
                  render: (r) => r.endDate,
                },
                {
                  key: "status",
                  header: "Status",
                  className: "0.8fr",
                  render: (r) => <StatusPill status={r.status} />,
                },
                {
                  key: "actions",
                  header: "Actions",
                  className: "0.6fr",
                  render: () => (
                    <button
                      title="Edit"
                      className="text-primary hover:text-primary/80"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  ),
                },
              ]}
            />
          </>
        )}

        {tab === "award" && (
          <>
            <StatRow stats={awardStats} />
            <DataTable<AwardProgram>
              rows={AWARD_PROGRAMS}
              searchableText={(r) => `${r.code} ${r.name} ${r.awardType} ${r.status}`}
              filterFields={[
                { key: "status", label: "Status", type: "single", options: distinctOptions(AWARD_PROGRAMS.map((p) => p.status)) },
                { key: "awardType", label: "Award Type", type: "single", options: distinctOptions(AWARD_PROGRAMS.map((p) => p.awardType)) },
                { key: "name", label: "Program Name", type: "multi", options: distinctOptions(AWARD_PROGRAMS.map((p) => p.name)) },
                { key: "startDate", label: "Award Start Date", type: "daterange" },
                { key: "endDate", label: "Award End Date", type: "daterange" },
              ]}
              filterPredicate={(r, v) => {
                const names = (v.name as string[]) || [];
                return (
                  (!v.status || r.status === v.status) &&
                  (!v.awardType || r.awardType === v.awardType) &&
                  (names.length === 0 || names.includes(r.name)) &&
                  inDateRange(r.startDate, v.startDate as DateRange) &&
                  inDateRange(r.endDate, v.endDate as DateRange)
                );
              }}
              columns={[
                {
                  key: "code",
                  header: "Program Code",
                  sortable: true,
                  className: "1.2fr",
                  sortValue: (r) => r.code,
                  render: (r) => <span className="font-medium text-gray-900">{r.code}</span>,
                },
                {
                  key: "name",
                  header: "Program Name",
                  sortable: true,
                  className: "1.8fr",
                  sortValue: (r) => r.name,
                  render: (r) => r.name,
                },
                {
                  key: "awardType",
                  header: "Award Type",
                  sortable: true,
                  className: "0.9fr",
                  sortValue: (r) => r.awardType,
                  render: (r) => r.awardType,
                },
                {
                  key: "start",
                  header: "Award Start Date",
                  sortable: true,
                  className: "1fr",
                  sortValue: (r) => r.startDate.split("-").reverse().join("-"),
                  render: (r) => r.startDate,
                },
                {
                  key: "end",
                  header: "Award End Date",
                  sortable: true,
                  className: "1fr",
                  sortValue: (r) => r.endDate.split("-").reverse().join("-"),
                  render: (r) => r.endDate,
                },
                {
                  key: "status",
                  header: "Status",
                  className: "0.7fr",
                  render: (r) => <StatusPill status={r.status} />,
                },
                {
                  key: "actions",
                  header: "Actions",
                  className: "1.3fr",
                  render: () => (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => {}}>
                        View Details
                      </Button>
                      <button title="Edit" className="text-primary hover:text-primary/80">
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          </>
        )}

        {tab === "team" && (
          <div className="pt-4">
            <DataTable<TeamRegistration>
              rows={TEAM_REGISTRATIONS}
              searchableText={(r) =>
                `${r.teamName} ${r.teamType} ${r.programName} ${r.createdBy} ${r.status}`
              }
              columns={[
                { key: "teamName", header: "Team Name", sortable: true, className: "1.2fr", sortValue: (r) => r.teamName, render: (r) => r.teamName },
                { key: "teamType", header: "Team type", sortable: true, className: "1fr", sortValue: (r) => r.teamType, render: (r) => r.teamType },
                { key: "members", header: "Number of Team Members", className: "1.2fr", render: (r) => r.members },
                { key: "programName", header: "Program Name", sortable: true, className: "1.2fr", sortValue: (r) => r.programName, render: (r) => r.programName },
                { key: "createdBy", header: "Created by", className: "1fr", render: (r) => r.createdBy },
                { key: "createdOn", header: "Created On", sortable: true, className: "1fr", sortValue: (r) => r.createdOn, render: (r) => r.createdOn },
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
