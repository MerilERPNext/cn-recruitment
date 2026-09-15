import React, { useEffect, useMemo, useState } from "react";
import { ArrowUp, Award, Filter, HandHeart, Layers, Search } from "lucide-react";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import FilterPanel, {
  type DateRange,
  type FilterField,
  type FilterValues,
} from "../shared/molecules/FilterPanel";
import WrapperHoverCard from "../shared/WrapperHoverCard";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import { useTargetUser } from "../../context/ViewedUserContext";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled } from "../../utils/uiPermission";
import {
  useDoctypeOptions,
  useRecognitionHistory,
  type RecognitionHistoryItem,
  type RecognitionHistoryType,
} from "../../services/recognitionService";
import EmployeeMultiSelect from "./components/MyAppreciationsHistory/EmployeeMultiSelect";
import PersonAvatar from "./components/MyAppreciationsHistory/PersonAvatar";
import { HistoryPagination, HistoryTabs } from "./components/MyAppreciationsHistory";
import type { AppreciationHistoryTab } from "./components/MyAppreciationsHistory";
import RecognitionRowActions from "./components/RecognitionRowActions";
import HistoryTypeBadge from "./HistoryTypeBadge";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Resolve relative Frappe file paths (e.g. "/private/files/..") against the API host.
const API_HOST =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (import.meta as any).env?.VITE_API_DOMAIN ||
  (typeof window !== "undefined" ? window.location.origin : "");
/* eslint-enable @typescript-eslint/no-explicit-any */

const resolveImage = (image?: string | null): string | undefined => {
  if (!image) return undefined;
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith("/")) return `${API_HOST}${image}`;
  return image;
};

// The three switchable views. `value` is sent straight to the API as
// `history_type`, so the switch below and the backend stay in lockstep.
const HISTORY_VIEWS: {
  value: RecognitionHistoryType;
  label: string;
  icon: typeof Layers;
}[] = [
  { value: "all", label: "All History", icon: Layers },
  { value: "award", label: "Award History", icon: Award },
  { value: "appreciation", label: "Appreciation History", icon: HandHeart },
];

const STATIC_FILTER_FIELDS: FilterField[] = [
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
  time: "",
  timeRange: { from: "", to: "" },
};

// Per-view copy. Keeps the switch in one place instead of scattering ternaries.
const viewCopy = (view: RecognitionHistoryType) => {
  switch (view) {
    case "award":
      return { searchPlaceholder: "Search awards...", empty: "No awards found." };
    case "appreciation":
      return {
        searchPlaceholder: "Search appreciations...",
        empty: "No appreciations found.",
      };
    default:
      return {
        searchPlaceholder: "Search recognitions...",
        empty: "No history found.",
      };
  }
};

// "Select Program" options follow the active view.
const programFiltersFor = (
  view: RecognitionHistoryType,
): [string, string, unknown][] => {
  switch (view) {
    case "award":
      return [["program_type", "=", "Award"]];
    case "appreciation":
      return [["program_type", "=", "Appreciation"]];
    default:
      return [["program_type", "in", ["Appreciation", "Award"]]];
  }
};

const RowLogo: React.FC<{ logo?: string; type: "Award" | "Appreciation" }> = ({
  logo,
  type,
}) => {
  const src = resolveImage(logo);
  const [failed, setFailed] = useState(false);
  const isAward = type === "Award";
  const ring = isAward ? "border-amber-300" : "border-violet-300";
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className={`size-9 shrink-0 rounded-full border-2 object-cover ${ring}`}
      />
    );
  }
  return (
    <div
      className={`flex size-9 shrink-0 items-center justify-center rounded-full border-2 ${ring} ${
        isAward ? "bg-amber-50" : "bg-violet-50"
      }`}
    >
      {isAward ? (
        <Award className="size-4 text-amber-400" />
      ) : (
        <HandHeart className="size-4 text-violet-400" />
      )}
    </div>
  );
};

const RecognitionHistory: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const { data: user } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const { targetEmployeeId } = useTargetUser();
  const employeeId = targetEmployeeId || user?.employee || "";

  const [view, setView] = useState<RecognitionHistoryType>("all");
  const [activeTab, setActiveTab] = useState<AppreciationHistoryTab>("received");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterValues, setFilterValues] =
    useState<FilterValues>(INITIAL_FILTER_VALUES);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Debounce the free-text search so we don't hit the API on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(id);
  }, [query]);

  // Row actions keep the permission gate of the page each record came from.
  const { data: uiPermission } = useGetUiPermission("Recognition");
  const awardActions = (["download", "view"] as const).filter((a) =>
    isActionEnabled(uiPermission, a, "Awards History"),
  );
  const appreciationActions = (["download", "view"] as const).filter((a) =>
    isActionEnabled(uiPermission, a, "My Appreciations History"),
  );

  const time = (filterValues.time as string) || "";
  const timeRange = (filterValues.timeRange as DateRange) || { from: "", to: "" };

  const { data: response, isLoading, isError } = useRecognitionHistory({
    employee: employeeId,
    history_type: view,
    program: (filterValues.program as string) || undefined,
    recognizer_type:
      ((filterValues.recognizerType as string[]) || []).join(",") || undefined,
    time: time || undefined,
    from_date: time === "custom" ? timeRange.from || undefined : undefined,
    to_date: time === "custom" ? timeRange.to || undefined : undefined,
    direction: activeTab,
    persons: selectedEmployees.join(",") || undefined,
    search: debouncedQuery || undefined,
    start: (page - 1) * pageSize,
    page_length: pageSize,
  });

  // Reset to the first page whenever anything that changes the result set changes.
  useEffect(() => {
    setPage(1);
  }, [view, activeTab, selectedEmployees, filterValues, pageSize, debouncedQuery]);

  // Switching view can leave a programme selected that the new view can't show.
  useEffect(() => {
    setFilterValues((prev) => (prev.program ? { ...prev, program: "" } : prev));
  }, [view]);

  const { data: programOptions = [] } = useDoctypeOptions("Recognition Program", {
    labelField: "program_name",
    filters: programFiltersFor(view),
    orderBy: "program_name asc",
  });

  const { data: roleOptions = [] } = useDoctypeOptions("Role", {
    filters: [["disabled", "=", 0]],
    orderBy: "name asc",
  });

  const filterFields = useMemo<FilterField[]>(
    () => [
      {
        key: "program",
        label: "Select Program",
        type: "single",
        options: programOptions,
      },
      {
        key: "recognizerType",
        label: "Select Recognizer / Recipient Type",
        type: "multi",
        options: roleOptions,
      },
      ...STATIC_FILTER_FIELDS,
    ],
    [programOptions, roleOptions],
  );

  const rows: RecognitionHistoryItem[] = response?.data ?? [];
  const totalRecords = response?.total_count ?? 0;
  const employeeOptions = response?.filter_options?.employees ?? [];
  const relationLabel = activeTab === "received" ? "Received From" : "Given To";
  const copy = viewCopy(view);

  const rowActionsNode = (
    row: RecognitionHistoryItem,
    layout: "buttons" | "icons",
  ) => {
    const actions =
      row.history_type === "Award" ? awardActions : appreciationActions;
    if (actions.length === 0) return null;
    return (
      <RecognitionRowActions
        layout={layout}
        actions={[...actions]}
        item={{
          name: row.name,
          title: row.title,
          person: row.person,
          date: row.date,
          direction: row.direction,
          values: row.values?.length ? row.values : row.value ? [row.value] : [],
          message: row.message,
          org: row.org,
          points: row.points,
        }}
      />
    );
  };

  const stateRow = (colSpan: number) => {
    if (isLoading)
      return (
        <tr>
          <td colSpan={colSpan} className="px-5 py-12 text-center text-sm text-gray-400">
            Loading history…
          </td>
        </tr>
      );
    if (isError)
      return (
        <tr>
          <td colSpan={colSpan} className="px-5 py-12 text-center text-sm text-red-500">
            Failed to load history.
          </td>
        </tr>
      );
    return (
      <tr>
        <td colSpan={colSpan} className="px-5 py-8 text-center text-sm text-gray-400">
          {copy.empty}
        </td>
      </tr>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-gray-200 bg-white px-4 py-4 md:px-6">
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">History</h1>
        <p className="mt-1 text-sm font-medium text-gray-500">
          Your awards and appreciations in one place
        </p>

        {/* View switch: All / Award / Appreciation */}
        <div
          role="tablist"
          aria-label="History type"
          className="mt-4 inline-flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1"
        >
          {HISTORY_VIEWS.map(({ value, label, icon: Icon }) => {
            const active = view === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setView(value)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <HistoryTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className="min-h-full bg-[#f6f7fb] p-3 font-sans sm:p-5 lg:p-6">
          <Card
            radius="xl"
            className="mx-auto w-full max-w-screen overflow-hidden border border-gray-100 shadow-sm"
          >
            {/* Toolbar */}
            <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={copy.searchPlaceholder}
                    className="w-full rounded-lg border border-gray-200 py-1.5 pl-9 pr-3 text-sm text-gray-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <EmployeeMultiSelect
                  options={employeeOptions}
                  selected={selectedEmployees}
                  onChange={setSelectedEmployees}
                  placeholder={
                    activeTab === "received"
                      ? "Filter by recognizer"
                      : "Filter by recipient"
                  }
                />
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFilterOpen(true)}
                  aria-label="Filter history"
                  className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                >
                  <Filter className="size-4" />
                </button>
              </div>
            </div>

            {isDesktop ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left">
                  <thead>
                    <tr className="bg-gray-100 border border-gray-100 text-sm text-gray-600">
                      <th className="px-5 py-3 font-semibold">Type</th>
                      <th className="px-5 py-3 font-semibold">Program</th>
                      <th className="px-5 py-3 font-semibold">{relationLabel}</th>
                      <th className="px-5 py-3 font-semibold">
                        <span className="flex items-center gap-1">
                          Date <ArrowUp className="size-3.5" />
                        </span>
                      </th>
                      <th className="px-5 py-3 font-semibold">Points</th>
                      <th className="px-5 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading || isError || rows.length === 0
                      ? stateRow(6)
                      : rows.map((row) => (
                          <tr
                            key={`${row.history_type}-${row.name}`}
                            className="border-t border-gray-100 hover:bg-gray-50/60"
                          >
                            <td className="px-5 py-4">
                              <HistoryTypeBadge type={row.history_type} />
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <RowLogo logo={row.logo} type={row.history_type} />
                                <span className="text-sm font-medium text-gray-800">
                                  {row.title}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm font-medium text-blue-600">
                              <WrapperHoverCard employeeId={row.person_id}>
                                <span className="cursor-pointer">{row.person}</span>
                              </WrapperHoverCard>
                            </td>
                            <td className="px-5 py-4 text-sm text-gray-700">
                              {row.date}
                            </td>
                            <td className="px-5 py-4 text-sm font-semibold text-amber-600">
                              {row.points ?? 0}
                            </td>
                            <td className="px-5 py-4">
                              {rowActionsNode(row, "buttons")}
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid gap-3 p-3">
                {isLoading ? (
                  <div className="py-12 text-center text-sm text-gray-400">
                    Loading history…
                  </div>
                ) : isError ? (
                  <div className="py-12 text-center text-sm text-red-500">
                    Failed to load history.
                  </div>
                ) : rows.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">
                    {copy.empty}
                  </div>
                ) : (
                  rows.map((row) => (
                    <article
                      key={`${row.history_type}-${row.name}`}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <RowLogo logo={row.logo} type={row.history_type} />
                        <div className="min-w-0 flex-1">
                          <HistoryTypeBadge type={row.history_type} className="mb-1" />
                          <Typography variant="mobileCardTitle" className="break-words">
                            {row.title}
                          </Typography>
                          <Typography variant="mobileCardLabel" className="mt-1 block">
                            {relationLabel}
                          </Typography>
                          <div className="mt-0.5 flex items-center gap-2">
                            <PersonAvatar
                              name={row.person}
                              imageUrl={row.person_image}
                              size={22}
                            />
                            <div className="flex min-w-0 items-center gap-1">
                              <WrapperHoverCard employeeId={row.person_id}>
                                <Typography
                                  variant="mobileCardSubtitle"
                                  className="cursor-pointer truncate hover:text-gray-800"
                                >
                                  {row.person}
                                </Typography>
                              </WrapperHoverCard>
                              <Typography
                                variant="mobileCardSubtitle"
                                className="truncate whitespace-pre"
                              >
                                · {row.date}
                              </Typography>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-start gap-3">
                        <div className="shrink-0 rounded-lg bg-amber-50 px-3 py-2 text-center">
                          <Typography variant="mobileCardLabel" className="block">
                            Points
                          </Typography>
                          <Typography
                            variant="bodySmall"
                            className="mt-1 block font-bold text-amber-600"
                          >
                            {row.points ?? 0}
                          </Typography>
                        </div>
                      </div>

                      <div className="mt-4">{rowActionsNode(row, "icons")}</div>
                    </article>
                  ))
                )}
              </div>
            )}

            <HistoryPagination
              totalRecords={totalRecords}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </Card>
        </main>
      </div>

      <FilterPanel
        open={filterOpen}
        fields={filterFields}
        values={filterValues}
        onClose={() => setFilterOpen(false)}
        onApply={setFilterValues}
      />
    </div>
  );
};

export default RecognitionHistory;
