import React, { useEffect, useMemo, useState } from "react";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import { useTargetUser } from "../../context/ViewedUserContext";
import FilterPanel, {
  type DateRange,
  type FilterField,
  type FilterValues,
} from "../shared/molecules/FilterPanel";
import { useAppreciationPrograms, useDoctypeOptions } from "../../services/recognitionService";
import {
  HistoryCardList,
  HistoryPagination,
  HistoryTable,
  HistoryTabs,
  HistoryToolbar,
  type AppreciationHistoryItem,
  type AppreciationHistoryTab,
} from "./components/MyAppreciationsHistory";

// Static filter fields (Select Program options come from the API).
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

const MyAppreciationsHistory: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const { data: user } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const { targetEmployeeId } = useTargetUser();
  const employeeId = targetEmployeeId || user?.employee || "";

  const [activeTab, setActiveTab] =
    useState<AppreciationHistoryTab>("received");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterValues, setFilterValues] =
    useState<FilterValues>(INITIAL_FILTER_VALUES);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Map the filter drawer values → API params (filtering + pagination happen
  // server-side, so the selected employees and tab are sent in the payload).
  const time = (filterValues.time as string) || "";
  const timeRange = (filterValues.timeRange as DateRange) || { from: "", to: "" };
  const apiParams = {
    employee: employeeId,
    program: (filterValues.program as string) || undefined,
    recognizer_type:
      ((filterValues.recognizerType as string[]) || []).join(",") || undefined,
    time: time || undefined,
    from_date: time === "custom" ? timeRange.from || undefined : undefined,
    to_date: time === "custom" ? timeRange.to || undefined : undefined,
    direction: activeTab,
    persons: selectedEmployees.join(",") || undefined,
    search: undefined as string | undefined,
    // Only show approved appreciations in the history list.
    status: "Approved",
    start: (page - 1) * pageSize,
    page_length: pageSize,
  };

  // Reset to the first page whenever the filters, tab or page size change.
  useEffect(() => {
    setPage(1);
  }, [activeTab, selectedEmployees, filterValues, pageSize]);

  const { data: response, isLoading } = useAppreciationPrograms(apiParams);

  // Select Program: `program_name` is a Link → Recognition Program, so options
  // come from the Recognition Program doctype (Appreciation-type) via the
  // resource API. Value = program id (matches the backend `program` filter).
  const { data: programOptions = [] } = useDoctypeOptions("Recognition Program", {
    labelField: "program_name",
    filters: [["program_type", "=", "Appreciation"]],
    orderBy: "program_name asc",
  });

  // Recognizer / Recipient Type options = the Role doctype list, fetched from
  // the backend via the Frappe resource API (dynamic, not hardcoded).
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

  // Employee options for the multi-select (distinct people, from the API).
  const employeeOptions = response?.filter_options?.employees ?? [];

  // API rows (already filtered + paginated server-side) → display items.
  const filteredAppreciations = useMemo<AppreciationHistoryItem[]>(() => {
    return (response?.data ?? []).map((it) => ({
      id: it.name,
      title: it.title,
      value: it.value,
      person: it.person,
      personImage: it.person_image,
      imageUrl: it.logo || undefined,
      date: it.date,
      tab: it.direction,
    }));
  }, [response]);

  const totalRecords = response?.total_count ?? 0;

  const relationLabel = activeTab === "received" ? "Received From" : "Given To";

  const content = (
    <main className="min-h-full bg-[#f6f7fb] p-3 font-sans sm:p-5 lg:p-6">
      <section className="mx-auto w-full max-w-screen rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <HistoryToolbar
          employeeOptions={employeeOptions}
          selectedEmployees={selectedEmployees}
          onSelectedEmployeesChange={setSelectedEmployees}
          onFilterClick={() => setFilterOpen(true)}
        />

        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-400">
            Loading appreciations…
          </div>
        ) : isDesktop ? (
          <HistoryTable
            items={filteredAppreciations}
            relationLabel={relationLabel}
          />
        ) : (
          <HistoryCardList
            items={filteredAppreciations}
            relationLabel={relationLabel}
          />
        )}

        <HistoryPagination
          totalRecords={totalRecords}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </section>
    </main>
  );

  const tabs = (
    <HistoryTabs activeTab={activeTab} onTabChange={setActiveTab} />
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-gray-200 bg-white px-4 py-4 md:px-6">
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
          My Appreciations History
        </h1>
        <p className="mt-1 text-sm font-medium text-gray-500">
          Manage your appreciations history
        </p>
      </div>
      {tabs}
      <div className="min-h-0 flex-1 overflow-y-auto">{content}</div>

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

export default MyAppreciationsHistory;
