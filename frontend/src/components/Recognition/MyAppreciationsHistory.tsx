import React, { useMemo, useState } from "react";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import FilterPanel, {
  type DateRange,
  type FilterField,
  type FilterValues,
} from "../shared/molecules/FilterPanel";
import { useAppreciationPrograms } from "../../services/recognitionService";
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
  timeRange: { from: "", to: "" },
};

const MyAppreciationsHistory: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const { data: user } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const employeeId = user?.employee ?? "";

  const [activeTab, setActiveTab] =
    useState<AppreciationHistoryTab>("received");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterValues, setFilterValues] =
    useState<FilterValues>(INITIAL_FILTER_VALUES);

  // Map the filter drawer values → API params.
  const time = (filterValues.time as string) || "";
  const timeRange = (filterValues.timeRange as DateRange) || { from: "", to: "" };
  const apiParams = {
    employee: employeeId,
    program: (filterValues.program as string) || undefined,
    recognizer_type:
      ((filterValues.recognizerType as string[]) || []).join(",") || undefined,
    recognized_with:
      ((filterValues.recognizedWith as string[]) || []).join(",") || undefined,
    time: time || undefined,
    from_date: time === "custom" ? timeRange.from || undefined : undefined,
    to_date: time === "custom" ? timeRange.to || undefined : undefined,
    search: searchTerm.trim() || undefined,
  };

  const { data: response, isLoading } = useAppreciationPrograms(apiParams);

  // Select Program options from the API.
  const programOptions = response?.filter_options?.programs ?? [];
  const filterFields = useMemo<FilterField[]>(
    () => [
      {
        key: "program",
        label: "Select Program",
        type: "single",
        options: programOptions,
      },
      ...STATIC_FILTER_FIELDS,
    ],
    [programOptions],
  );

  // API rows → display items, split by the active tab + client-side search.
  const filteredAppreciations = useMemo<AppreciationHistoryItem[]>(() => {
    const s = searchTerm.trim().toLowerCase();
    return (response?.data ?? [])
      .filter((it) => it.direction === activeTab)
      .filter(
        (it) =>
          !s ||
          [it.title, it.value, it.person, it.date].some((f) =>
            (f || "").toLowerCase().includes(s),
          ),
      )
      .map((it) => ({
        id: it.name,
        title: it.title,
        value: it.value,
        person: it.person,
        personImage: it.person_image,
        date: it.date,
        tab: it.direction,
      }));
  }, [response, activeTab, searchTerm]);

  const relationLabel = activeTab === "received" ? "Received From" : "Given To";

  const content = (
    <main className="min-h-full bg-[#f6f7fb] p-3 font-sans sm:p-5 lg:p-6">
      <section className="mx-auto w-full max-w-screen rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <HistoryToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
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
          <HistoryCardList items={filteredAppreciations} />
        )}

        <HistoryPagination totalRecords={filteredAppreciations.length} />
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
