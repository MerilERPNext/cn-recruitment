import React, { useState } from "react";
import { Card } from "../../shared/atoms/Card";
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronRight as RowChevron,
  Eye,
  Filter,
  Search,
  Settings2,
  Upload,
} from "lucide-react";
import FilterPanel, {
  type FilterField,
  type FilterValues,
} from "../../shared/molecules/FilterPanel";
import SettingsPanel, {
  type SettingsColumn,
  type TableSettings,
} from "../../shared/molecules/SettingsPanel";
import SavedViewsMenu from "../../shared/molecules/SavedViewsMenu";
import { NOMINATIONS } from "./vibeMockData";

const FILTER_PILLS = [
  { label: "INDIVIDUAL AWARDS RECEIVED", count: 9 },
  { label: "INDIVIDUAL AWARDS RAISED", count: 2 },
  { label: "TEAM AWARDS RAISED", count: 0 },
];

// Distinct options derived from the data.
const STATUS_OPTIONS = Array.from(new Set(NOMINATIONS.map((n) => n.status))).map(
  (s) => ({ label: s, value: s }),
);
const PROGRAM_OPTIONS = Array.from(
  new Set(NOMINATIONS.map((n) => n.program)),
).map((p) => ({ label: p, value: p }));

const NOMINATION_FILTER_FIELDS: FilterField[] = [
  { key: "approvalStatus", label: "Approval Status", type: "single", options: STATUS_OPTIONS },
  { key: "nominationDate", label: "Nomination Date", type: "daterange" },
  { key: "lastActionDate", label: "Last Action Date", type: "daterange" },
  {
    key: "program",
    label: "Nomination Program Names(ID)",
    type: "multi",
    options: PROGRAM_OPTIONS,
  },
];

const INITIAL_FILTER_VALUES: FilterValues = {
  approvalStatus: "",
  nominationDate: { from: "", to: "" },
  lastActionDate: { from: "", to: "" },
  program: [],
};

// Toggleable columns for the Settings drawer (data-row keys).
const NOMINATION_COLUMNS: SettingsColumn[] = [
  { key: "id", label: "Nomination ID" },
  { key: "program", label: "Nomination Program Names(ID)" },
  { key: "nominatedBy", label: "Nominated By" },
  { key: "nominationDate", label: "Nomination Date" },
  { key: "lastActionDate", label: "Last Action Date" },
  { key: "status", label: "Approval Status" },
];

const INITIAL_TABLE_SETTINGS: TableSettings = {
  density: "comfort",
  visibleColumns: NOMINATION_COLUMNS.map((c) => c.key),
};

const AwardsNominationWorkflows: React.FC = () => {
  const [activePill, setActivePill] = useState(0);
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterValues, setFilterValues] =
    useState<FilterValues>(INITIAL_FILTER_VALUES);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savedViewsOpen, setSavedViewsOpen] = useState(false);
  const [tableSettings, setTableSettings] = useState<TableSettings>(
    INITIAL_TABLE_SETTINGS,
  );

  const showCol = (key: string) => tableSettings.visibleColumns.includes(key);
  const rowPad =
    tableSettings.density === "compact"
      ? "py-2"
      : tableSettings.density === "expanded"
        ? "py-6"
        : "py-4";
  const colSpan = 2 + tableSettings.visibleColumns.length; // checkbox + cols + actions

  const q = query.trim().toLowerCase();
  const filteredNominations = q
    ? NOMINATIONS.filter((row) =>
        [row.id, row.program, row.nominatedBy, row.nominationDate, row.lastActionDate, row.status]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : NOMINATIONS;

  return (
    <div className="p-4 md:p-6">
      {/* Filter pills */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {FILTER_PILLS.map((pill, i) => (
          <button
            key={pill.label}
            onClick={() => setActivePill(i)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
              activePill === i
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {pill.label} {pill.count}
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
            <div className="relative">
              <button
                type="button"
                onClick={() => setSavedViewsOpen((o) => !o)}
                aria-label="Saved views"
                className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
              >
                <Eye className="size-4" />
              </button>
              <SavedViewsMenu
                open={savedViewsOpen}
                onClose={() => setSavedViewsOpen(false)}
                count={0}
                canUpdate={false}
              />
            </div>
            <button className="rounded-lg border border-gray-200 p-2 text-gray-500">
              <Upload className="size-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead>
              <tr className="text-sm text-gray-600 border-y border-gray-100">
                <th className="px-4 py-3 font-semibold">
                  <input type="checkbox" className="accent-primary" />
                </th>
                {showCol("id") && (
                  <th className="px-4 py-3 font-semibold">Nomination ID</th>
                )}
                {showCol("program") && (
                  <th className="px-4 py-3 font-semibold">
                    Nomination Program Names(ID)
                  </th>
                )}
                {showCol("nominatedBy") && (
                  <th className="px-4 py-3 font-semibold">Nominated By</th>
                )}
                {showCol("nominationDate") && (
                  <th className="px-4 py-3 font-semibold">
                    <span className="flex items-center gap-1">
                      Nomination Date <ArrowUp className="size-3.5" />
                    </span>
                  </th>
                )}
                {showCol("lastActionDate") && (
                  <th className="px-4 py-3 font-semibold">Last Action Date</th>
                )}
                {showCol("status") && (
                  <th className="px-4 py-3 font-semibold">Approval Status</th>
                )}
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredNominations.length === 0 && (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-gray-400">
                    No nominations found.
                  </td>
                </tr>
              )}
              {filteredNominations.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/60">
                  <td className={`px-4 ${rowPad}`}>
                    <input type="checkbox" className="accent-primary" />
                  </td>
                  {showCol("id") && (
                    <td className={`px-4 ${rowPad} text-sm font-medium text-gray-800`}>
                      {row.id}
                    </td>
                  )}
                  {showCol("program") && (
                    <td className={`px-4 ${rowPad} text-sm text-gray-700 max-w-[280px] truncate`}>
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
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                        <span className="size-1.5 rounded-full bg-green-500" />
                        {row.status}
                      </span>
                    </td>
                  )}
                  <td className={`px-4 ${rowPad}`}>
                    <button className="text-gray-400 hover:text-gray-700">
                      <RowChevron className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 text-sm text-gray-500">
          <span>
            {filteredNominations.length === 0 ? 0 : 1} - {filteredNominations.length} of{" "}
            {filteredNominations.length} Records
          </span>
          <div className="flex items-center gap-2">
            <button className="rounded-md border border-gray-200 p-1.5">
              <ChevronLeft className="size-4" />
            </button>
            <span className="flex size-7 items-center justify-center rounded-md bg-gray-100 font-medium text-gray-700">
              1
            </span>
            <button className="rounded-md border border-gray-200 p-1.5">
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-gray-200 px-3 py-1">10</span>
            <span>per page</span>
          </div>
        </div>
      </Card>

      <FilterPanel
        open={filterOpen}
        fields={NOMINATION_FILTER_FIELDS}
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
