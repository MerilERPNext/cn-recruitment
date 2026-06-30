import React, { useState } from "react";
import { Card } from "../../shared/atoms/Card";
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Search,
  Share2,
  Trophy,
  Upload,
} from "lucide-react";
import FilterPanel, {
  type FilterField,
  type FilterValues,
} from "../../shared/molecules/FilterPanel";
import { AWARD_HISTORY } from "./vibeMockData";

// Same filter config as "My Appreciations History" — passed to the reusable
// <FilterPanel />.
const AWARD_FILTER_FIELDS: FilterField[] = [
  {
    key: "program",
    label: "Select Program",
    type: "single",
    options: [
      { label: "ALL", value: "all" },
      { label: "Spot Award", value: "spot-award" },
      { label: "Star Performer", value: "star-performer" },
      { label: "Team Excellence", value: "team-excellence" },
    ],
  },
  {
    key: "recognizerType",
    label: "Select Recognizer / Recipient Type",
    type: "multi",
    options: [
      { label: "ALL", value: "all" },
      { label: "L1 Manager", value: "l1-manager" },
      { label: "L2 Manager", value: "l2-manager" },
      { label: "Reporting Span (Up to 5 Levels)", value: "reporting-span" },
      { label: "Others", value: "others" },
    ],
  },
  {
    key: "recognizedWith",
    label: "Select Recognized with",
    type: "multi",
    options: [
      { label: "Points", value: "points" },
      { label: "Non-Point Rewards", value: "non-point-rewards" },
      { label: "Values", value: "values" },
      { label: "Recognition Cards", value: "recognition-cards" },
    ],
  },
  {
    key: "time",
    label: "Time",
    type: "single",
    searchable: false,
    options: [
      { label: "ALL", value: "all" },
      { label: "Last 7 Days", value: "last-7-days" },
      { label: "Last 30 Days", value: "last-30-days" },
      { label: "Custom", value: "custom" },
    ],
    // "Custom" reveals a start/end date range.
    reveal: {
      when: "custom",
      field: { key: "timeRange", label: "Date Range", type: "daterange" },
    },
  },
];

const INITIAL_FILTER_VALUES: FilterValues = {
  program: "",
  recognizerType: [],
  recognizedWith: [],
  time: "",
};

const ValueChips: React.FC<{ values: string[] }> = ({ values }) => (
  <div className="flex flex-wrap gap-2">
    {values.map((v, i) => (
      <span
        key={i}
        className="rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-600 whitespace-nowrap"
      >
        {v}
      </span>
    ))}
  </div>
);

const ActionButton: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <button className="flex items-center gap-1.5 rounded-lg border border-purple-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-purple-50 transition-colors">
    {icon}
    {label}
  </button>
);

const AwardsHistory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"Received" | "Given">("Received");
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterValues, setFilterValues] =
    useState<FilterValues>(INITIAL_FILTER_VALUES);

  const q = query.trim().toLowerCase();
  const filteredHistory = q
    ? AWARD_HISTORY.filter((row) =>
        [row.title, row.receivedFrom, row.receivedDate, ...(row.values || [])]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : AWARD_HISTORY;

  return (
    <div className="p-4 md:p-6">
      {/* Breadcrumb + center tabs */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="text-gray-400">···</span>
          <span>/</span>
          <span>All Awards</span>
          <span>/</span>
          <span className="font-semibold text-gray-900">My Awards History</span>
        </div>
        <div className="flex items-center gap-6">
          {(["Received", "Given"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div />
      </div>

      <Card radius="xl" className="border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 p-3">
          <div className="relative w-44 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search awards..."
              className="w-full rounded-lg border border-gray-200 py-1.5 pl-9 pr-3 text-sm text-gray-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              aria-label="Filter awards"
              className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
            >
              <Filter className="size-4" />
            </button>
            <button className="rounded-lg border border-gray-200 p-2 text-gray-500">
              <Upload className="size-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="bg-blue-50/40 text-sm text-gray-600">
                <th className="px-5 py-3 font-semibold">Awards</th>
                <th className="px-5 py-3 font-semibold">Values</th>
                <th className="px-5 py-3 font-semibold">Received From</th>
                <th className="px-5 py-3 font-semibold">
                  <span className="flex items-center gap-1">
                    Received Date <ArrowUp className="size-3.5" />
                  </span>
                </th>
                <th className="px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">
                    No awards found.
                  </td>
                </tr>
              )}
              {filteredHistory.map((row, i) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/60">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full border-2 border-amber-300 bg-amber-50">
                        <Trophy className="size-4 text-amber-400" />
                      </div>
                      <span className="text-sm font-medium text-gray-800">{row.title}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <ValueChips values={row.values} />
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-blue-600">{row.receivedFrom}</td>
                  <td className="px-5 py-4 text-sm text-gray-700">{row.receivedDate}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <ActionButton icon={<Download className="size-3.5" />} label="Download" />
                      <ActionButton icon={<Share2 className="size-3.5" />} label="Share" />
                      <ActionButton icon={<Eye className="size-3.5" />} label="View" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 text-sm text-gray-500">
          <span>
            {filteredHistory.length === 0 ? 0 : 1} - {filteredHistory.length} of{" "}
            {filteredHistory.length} Records
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
        fields={AWARD_FILTER_FIELDS}
        values={filterValues}
        onClose={() => setFilterOpen(false)}
        onApply={setFilterValues}
      />
    </div>
  );
};

export default AwardsHistory;
