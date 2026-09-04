import { useState, useCallback, useMemo, type ReactNode } from "react";
import { useCurrentEmployee } from "../../hooks/useEmployee";
import { useScreenSize } from "../../hooks/useScreenSize";
import DataListView, { FilterField } from "../DataListView";
import CardTable from "../shared/CardTable";
import DetailView from "./IJPDetailView";
import ApplyView from "./IJPApplyView";
import {
  IJPOpeningColumn,
  JobType,
  propsListViewComponents,
} from "./IJPTypes";
import {
  useIJPOpeningColumns,
  useMyApplications,
} from "../../hooks/useRecruitment";
import { Employee } from "../../types/employee";
import { Typography } from "../shared/atoms/Typography";
import Badge from "../shared/Badge";
import formatToIndianDate from "../../utils/formatToIndianDate";

// ─── Status Badge Helper ──────────────────────────────────────────────────────

const renderStatusBadge = (status: string | null) => {
  const normStatus = (status || "Draft").toLowerCase();
  let bg = "bg-slate-100";
  let text = "text-slate-800";

  if (normStatus === "open") {
    bg = "bg-emerald-100";
    text = "text-emerald-800";
  } else if (normStatus === "closed") {
    bg = "bg-rose-100";
    text = "text-rose-800";
  } else if (normStatus === "on hold") {
    bg = "bg-amber-100";
    text = "text-amber-800";
  }

  return (
    <Badge
      label={status || "Draft"}
      backgroundColor={bg}
      textColor={text}
      size="sm"
    />
  );
};

// ─── Views ────────────────────────────────────────────────────────────────────

const DEFAULT_COLUMNS: IJPOpeningColumn[] = [
  { fieldname: "name", label: "Opening ID", value_key: "name" },
  { fieldname: "job_title", label: "Job Title", value_key: "job_title" },
  { fieldname: "designation", label: "Designation", value_key: "designation" },
  { fieldname: "department", label: "Department", value_key: "department" },
  { fieldname: "company", label: "Company", value_key: "company" },
  { fieldname: "location", label: "Location", value_key: "location" },
  { fieldname: "posted_on", label: "Posted On", value_key: "posted_on" },
  { fieldname: "status", label: "Status", value_key: "status" },
];

const DATE_VALUE_KEYS = new Set([
  "posted_on",
  "closes_on",
  "applied_on",
  "creation",
  "modified",
]);

const getColumnValue = (item: JobType, column: IJPOpeningColumn) =>
  item[column.value_key] ?? item[column.fieldname];

const getDisplayValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "--";
  if (Array.isArray(value)) return value.filter(Boolean).join(", ") || "--";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const isDesignationColumn = (key: string) =>
  key.toLowerCase().includes("designation");

const MAX_COLUMNS_BEFORE_SCROLL = 6;

const getColumnWidth = (column: IJPOpeningColumn, totalColumns: number) => {
  if (totalColumns <= MAX_COLUMNS_BEFORE_SCROLL) {
    return "minmax(0, 1fr)";
  }

  const key = (column.value_key || column.fieldname).toLowerCase();
  if (key === "name" || key.includes("opening")) return "9rem";
  if (key === "job_title" || key.includes("job_title")) return "14rem";
  if (isDesignationColumn(key)) return "12rem";
  if (key.includes("department")) return "12rem";
  if (key.includes("company")) return "12rem";
  if (key.includes("location")) return "11rem";
  if (key === "status") return "8rem";
  if (DATE_VALUE_KEYS.has(key) || key.includes("date")) return "9rem";
  return "12rem";
};

const renderColumnValue = (
  item: JobType,
  column: IJPOpeningColumn,
  applied: boolean,
): ReactNode => {
  const key = column.value_key || column.fieldname;
  const value = getColumnValue(item, column);

  if (key === "status") {
    return (
      <div className="flex justify-center items-center">
        {renderStatusBadge(String(value || ""))}
      </div>
    );
  }

  if (key === "job_title") {
    return (
      <div className="flex items-center justify-center gap-1.5 min-w-0">
        <span className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer no-underline truncate block">
          {getDisplayValue(value)}
        </span>
        {applied && (
          <Badge
            label="Applied"
            backgroundColor="bg-emerald-100"
            textColor="text-emerald-800"
            size="sm"
          />
        )}
      </div>
    );
  }

  const displayValue =
    DATE_VALUE_KEYS.has(key) && value
      ? formatToIndianDate(String(value)) || "--"
      : getDisplayValue(value);

  return (
    <div
      className={`text-slate-800 truncate text-center ${key === "name" ? "font-medium" : ""}`}
      title={isDesignationColumn(key) ? displayValue : undefined}
    >
      {displayValue}
    </div>
  );
};

function ListView({
  appliedIds,
  onSelectJob,
  currentEmployee,
}: propsListViewComponents) {
  const { isDesktop } = useScreenSize();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { data: openingColumns } = useIJPOpeningColumns();

  const columns = useMemo(() => {
    const apiColumns = openingColumns?.filter(
      (column) => column.label && (column.value_key || column.fieldname),
    );
    return apiColumns?.length ? apiColumns : DEFAULT_COLUMNS;
  }, [openingColumns]);

  const titles = useMemo(() => columns.map((column) => column.label), [columns]);

  const columnWidths = useMemo(
    () => columns.map((column) => getColumnWidth(column, columns.length)),
    [columns],
  );

  const filterFields: FilterField[] = useMemo(
    () => [
      {
        fieldname: "status",
        label: "Status",
        fieldtype: "Select" as const,
        options: [
          { label: "Open", value: "Open" },
          { label: "Closed", value: "Closed" },
          { label: "Draft", value: "Draft" },
          { label: "On Hold", value: "On Hold" },
        ],
      },
    ],
    [],
  );

  const clientFilterFn = useCallback(
    (data: JobType[]) => {
      let filtered = data;

      if (statusFilter) {
        filtered = filtered.filter(
          (item) => item.status?.toLowerCase() === statusFilter.toLowerCase(),
        );
      }

      if (searchTerm.trim()) {
        const s = searchTerm.trim().toLowerCase();
        const searchFields: (keyof JobType)[] = [
          "job_title",
          "opening_code",
          "name",
          "designation",
          "department",
          "company",
          "location",
        ];
        filtered = filtered.filter((item) =>
          searchFields.some((field) =>
            item[field] ? String(item[field]).toLowerCase().includes(s) : false,
          ),
        );
      }

      return filtered;
    },
    [statusFilter, searchTerm],
  );

  const ItemComponent = useMemo(
    () =>
      ({ item }: { item: JobType }) => {
        const applied = item.name ? appliedIds.includes(item.name) : false;

        const handleRowClick = () => {
          onSelectJob(item);
        };

        if (isDesktop) {
          return (
            <div
              className="grid gap-4 px-6 py-4 border-t border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer items-center min-w-max bg-white text-sm"
              style={{ gridTemplateColumns: columnWidths.join(" ") }}
              onClick={handleRowClick}
            >
              {columns.map((column) => (
                <div key={`${column.fieldname}-${column.value_key}`} className="min-w-0">
                  {renderColumnValue(item, column, applied)}
                </div>
              ))}
            </div>
          );
        }

        // Mobile View
        return (
          <div
            className="cursor-pointer border-t-4 border-x border-b border-x-primary/20 border-b-primary/20 shadow-sm border-primary bg-white rounded-xl m-2"
            onClick={handleRowClick}
          >
            <div className="p-4 flex flex-col gap-4 w-full">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel">
                    {columns[0]?.label || "Opening ID"}
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {getDisplayValue(
                      getColumnValue(item, columns[0] || DEFAULT_COLUMNS[0]),
                    )}
                  </Typography>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {renderStatusBadge(item.status)}
                  {applied && (
                    <Badge
                      label="Applied"
                      backgroundColor="bg-emerald-100"
                      textColor="text-emerald-800"
                      size="sm"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {columns.slice(1).map((column) => {
                  const key = column.value_key || column.fieldname;
                  if (key === "status") return null;
                  const value = getColumnValue(item, column);
                  const displayValue =
                    DATE_VALUE_KEYS.has(key) && value
                      ? formatToIndianDate(String(value)) || "--"
                      : getDisplayValue(value);

                  return (
                    <div
                      key={`${column.fieldname}-${column.value_key}`}
                      className="flex flex-col gap-1 min-w-0"
                    >
                      <Typography variant="mobileCardLabel">
                        {column.label}
                      </Typography>
                      <Typography
                        variant="mobileCardValue"
                        className={`truncate ${
                          key === "job_title"
                            ? "font-semibold text-gray-900"
                            : ""
                        }`}
                        title={isDesignationColumn(key) ? displayValue : undefined}
                      >
                        {displayValue}
                      </Typography>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      },
    [isDesktop, appliedIds, onSelectJob, columns, columnWidths],
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden w-full max-w-full">
      {isDesktop ? (
        <CardTable titles={titles} columnWidths={columnWidths}>
          <DataListView
            queryKey={["ijp-openings", currentEmployee?.name || ""]}
            customAPI={{
              method: "recruitment.api.channels.ijp.list_openings",
              params: {
                employee: currentEmployee?.name,
              },
            }}
            ItemComponent={ItemComponent}
            isSearch={true}
            isFilter={true}
            filterFields={filterFields}
            onFiltersChange={(filters) => {
              setStatusFilter(filters.status || null);
            }}
            onSearchChange={setSearchTerm}
            clientFilterFn={clientFilterFn}
            pageSize={10}
          />
        </CardTable>
      ) : (
        <div className="space-y-3 px-1">
          <DataListView
            queryKey={["ijp-openings", currentEmployee?.name || ""]}
            customAPI={{
              method: "recruitment.api.channels.ijp.list_openings",
              params: {
                employee: currentEmployee?.name,
              },
            }}
            ItemComponent={ItemComponent}
            isSearch={true}
            isFilter={true}
            filterFields={filterFields}
            onFiltersChange={(filters) => {
              setStatusFilter(filters.status || null);
            }}
            onSearchChange={setSearchTerm}
            clientFilterFn={clientFilterFn}
            pageSize={10}
          />
        </div>
      )}
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function IJPOpenings() {
  const { isDesktop } = useScreenSize();
  const { data: currentEmployee, isLoading: isEmployeeLoading } =
    useCurrentEmployee();
  const [view, setView] = useState("list"); // "list" | "detail" | "apply"
  const [selectedJob, setSelectedJob] = useState<JobType | null>(null);
  const { data: myAppsData } = useMyApplications();

  const appliedIds = useMemo(() => {
    if (!myAppsData?.applications) return [];
    return myAppsData.applications
      .filter((app) => app.opening && app.status?.toLowerCase() !== "withdrawn")
      .map((app) => app.opening as string);
  }, [myAppsData]);

  const handleSelectJob = (job: JobType) => {
    setSelectedJob(job);
    setView("detail");
  };
  const handleApply = () => setView("apply");
  const handleBack = () => setView("list");
  const handleBackToDetail = () => setView("detail");

  const handleSubmitDone = useCallback((jobId: string) => {
    // Handled dynamically by useMyApplications invalidation
    console.log("Application submitted for job:", jobId);
  }, []);

  if (isEmployeeLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-sm text-gray-500 font-sans">
          Loading Employee details...
        </div>
      </div>
    );
  }

  const employeeDoc = currentEmployee as Employee | null;

  const header = (() => {
    switch (view) {
      case "detail":
        return {
          title: "Job Detail",
          subtitle: "View requirements and information for this job",
        };
      case "apply":
        return {
          title: "Apply for IJP",
          subtitle: "Fill out the application to submit your candidacy",
        };
      default:
        return {
          title: "IJP Openings",
          subtitle: "Explore and apply for internal job openings",
        };
    }
  })();

  const renderContent = () => {
    if (view === "detail" && selectedJob) {
      return (
        <DetailView
          job={selectedJob}
          appliedIds={appliedIds}
          onBack={handleBack}
          onApply={handleApply}
        />
      );
    }
    if (view === "apply" && selectedJob) {
      return (
        <ApplyView
          job={selectedJob}
          onCancel={handleBackToDetail}
          onSubmitDone={handleSubmitDone}
        />
      );
    }
    return (
      <ListView
        appliedIds={appliedIds}
        onSelectJob={handleSelectJob}
        currentEmployee={employeeDoc}
      />
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans">
      {isDesktop && (
        <div className="flex-shrink-0">
          <div className="px-4 py-1 md:pb-4">
            <Typography variant="h4">{header.title}</Typography>
            <Typography variant="bodySmall" color="body2">
              {header.subtitle}
            </Typography>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto md:px-2 pb-5 md:pb-20 mt-2 max-w-full overflow-x-hidden">
        {renderContent()}
      </div>
    </div>
  );
}
