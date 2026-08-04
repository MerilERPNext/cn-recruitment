/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../../shared/atoms/Card";
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Trophy,
} from "lucide-react";
import FilterPanel, {
  type DateRange,
  type FilterField,
  type FilterValues,
} from "../../shared/molecules/FilterPanel";
import { useCurrentEmployeeDetails } from "../../../hooks/useEmployee";
import { useTargetUser } from "../../../context/ViewedUserContext";
import { useAwardPrograms, useDoctypeOptions } from "../../../services/recognitionService";
import EmployeeMultiSelect from "../components/MyAppreciationsHistory/EmployeeMultiSelect";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import RecognitionRowActions from "../components/RecognitionRowActions";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../utils/uiPermission";

// Resolve relative Frappe file paths (e.g. "/private/files/..") against the API host.
const API_HOST =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (import.meta as any).env?.VITE_API_DOMAIN ||
  (typeof window !== "undefined" ? window.location.origin : "");

const resolveImage = (image?: string | null): string | undefined => {
  if (!image) return undefined;
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith("/")) return `${API_HOST}${image}`;
  return image;
};

// Static filter fields — the "Select Program" options come from the API.
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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const ValueChips: React.FC<{ values: string[]; fallback: string }> = ({ values, fallback }) => {
  const chips = values.length > 0 ? values : fallback ? [fallback] : [];
  if (chips.length === 0) return <span className="text-xs text-gray-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((v, i) => (
        <span
          key={`${v}-${i}`}
          className="rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-600 whitespace-nowrap"
        >
          {v}
        </span>
      ))}
    </div>
  );
};

const AwardLogo: React.FC<{ logo?: string }> = ({ logo }) => {
  const src = resolveImage(logo);
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className="size-9 rounded-full border-2 border-amber-300 object-cover"
      />
    );
  }
  return (
    <div className="flex size-9 items-center justify-center rounded-full border-2 border-amber-300 bg-amber-50">
      <Trophy className="size-4 text-amber-400" />
    </div>
  );
};

const AwardsHistory: React.FC = () => {
  const { data: user } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const { targetEmployeeId } = useTargetUser();
  const employeeId = targetEmployeeId || user?.employee || "";

  // Row action buttons gated by the "Recognition" app action permissions.
  const { data: uiPermission } = useGetUiPermission("Recognition");
  const rowActions = (["download", "view"] as const).filter((a) =>
    isActionEnabled(uiPermission, a, "Awards History"),
  );

  const [activeTab, setActiveTab] = useState<"Received" | "Given">("Received");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<FilterValues>(INITIAL_FILTER_VALUES);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Debounce the free-text search so we don't hit the API on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(id);
  }, [query]);

  // Map the filter drawer + toolbar values → API params (all filtering, search
  // and pagination happen server-side).
  const time = (filterValues.time as string) || "";
  const timeRange = (filterValues.timeRange as DateRange) || { from: "", to: "" };
  const direction = activeTab === "Received" ? "received" : "given";
  const apiParams = {
    employee: employeeId,
    program: (filterValues.program as string) || undefined,
    recognizer_type:
      ((filterValues.recognizerType as string[]) || []).join(",") || undefined,
    time: time || undefined,
    from_date: time === "custom" ? timeRange.from || undefined : undefined,
    to_date: time === "custom" ? timeRange.to || undefined : undefined,
    direction: direction as "received" | "given",
    persons: selectedEmployees.join(",") || undefined,
    search: debouncedQuery || undefined,
    start: (page - 1) * pageSize,
    page_length: pageSize,
  };

  // Reset to the first page whenever the filters, tab, search or page size change.
  useEffect(() => {
    setPage(1);
  }, [activeTab, selectedEmployees, filterValues, pageSize, debouncedQuery]);

  const { data: response, isLoading, isError, error, refetch, isFetching } =
    useAwardPrograms(apiParams);

  // Select Program: `program_name` is a Link → Recognition Program, so options
  // come from the Recognition Program doctype (Award-type) via the resource API.
  // Value = program id (matches the backend `program` filter).
  const { data: programOptions = [] } = useDoctypeOptions("Recognition Program", {
    labelField: "program_name",
    filters: [["program_type", "=", "Award"]],
    orderBy: "program_name asc",
  });

  // Recognizer / Recipient Type options are the Role doctype list, fetched
  // dynamically from the backend via the Frappe resource API (Recognition
  // Program's `recognizers_relationship_with_receiver` is a Link → Role).
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

  // Distinct people for the persons multi-select (from the API).
  const employeeOptions = response?.filter_options?.employees ?? [];

  const rows = response?.data ?? [];
  const totalRecords = response?.total_count ?? 0;

  const relationLabel = activeTab === "Received" ? "Received From" : "Given To";

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startRow = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div>
      {/* Title + center tabs */}
      <div className="mb-5">
        <div className="border-b border-gray-200 bg-white px-4 py-4 md:px-6">
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
          My Awards History
        </h1>
        <p className="mt-1 text-sm font-medium text-gray-500">
          Manage your awards history
        </p>
        </div>
        <div className="flex items-center justify-center gap-1 border-b border-gray-200 bg-white">
          {(["Received", "Given"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`min-w-20 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                activeTab === tab
                  ? "border-primary text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 md:p-6">
      <Card radius="xl" className="border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search awards..."
                className="w-full rounded-lg border border-gray-200 py-1.5 pl-9 pr-3 text-sm text-gray-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <EmployeeMultiSelect
              options={employeeOptions}
              selected={selectedEmployees}
              onChange={setSelectedEmployees}
              placeholder={
                activeTab === "Received" ? "Filter by recognizer" : "Filter by recipient"
              }
            />
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              aria-label="Filter awards"
              className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
            >
              <Filter className="size-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="bg-blue-50/40 text-sm text-gray-600">
                <th className="px-5 py-3 font-semibold">Awards</th>
                <th className="px-5 py-3 font-semibold">Values</th>
                <th className="px-5 py-3 font-semibold">{relationLabel}</th>
                <th className="px-5 py-3 font-semibold">
                  <span className="flex items-center gap-1">
                    Received Date <ArrowUp className="size-3.5" />
                  </span>
                </th>
                <th className="px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">
                    Loading awards…
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-red-500">
                    {(error as Error)?.message || "Failed to load awards."}
                    <button
                      onClick={() => refetch()}
                      className="ml-3 rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">
                    No awards found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.name} className="border-t border-gray-100 hover:bg-gray-50/60">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <AwardLogo logo={row.logo} />
                        <span className="text-sm font-medium text-gray-800">{row.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <ValueChips values={row.values} fallback={row.value} />
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-blue-600">
                      <WrapperHoverCard employeeId={row.person_id}>
                        <span className="cursor-pointer">{row.person}</span>
                      </WrapperHoverCard>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">{row.date}</td>
                    <td className="px-5 py-4">
                      <RecognitionRowActions
                        layout="buttons"
                        actions={[...rowActions]}
                        item={{
                          name: row.name,
                          title: row.title,
                          person: row.person,
                          date: row.date,
                          direction: row.direction,
                          values: row.values,
                          message: row.message,
                          org: row.org,
                          points: row.points,
                        }}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 px-5 py-3 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {isFetching && !isLoading ? "Updating… " : ""}
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
      </Card>

      <FilterPanel
        open={filterOpen}
        fields={filterFields}
        values={filterValues}
        onClose={() => setFilterOpen(false)}
        onApply={setFilterValues}
      />
    </div>
    </div>
  );
};

export default AwardsHistory;
