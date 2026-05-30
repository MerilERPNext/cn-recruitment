import { useState, useCallback, useMemo } from "react";
import { useCurrentEmployee } from "../../hooks/useEmployee";
import { useScreenSize } from "../../hooks/useScreenSize";
import DataListView, { FilterField } from "../DataListView";
import CardTable from "../shared/CardTable";
import DetailView from "./IJPDetailView";
import ApplyView from "./IJPApplyView";
import { JobType, propsListViewComponents } from "./IJPTypes";
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

function ListView({
  appliedIds,
  onSelectJob,
  currentEmployee,
}: propsListViewComponents) {
  const { isDesktop } = useScreenSize();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const columnWidths = [
    "1.25fr",
    "1.75fr",
    "1.25fr",
    "1.25fr",
    "1.25fr",
    "1.25fr",
    "1fr",
    "1fr",
  ];
  const titles = [
    "Opening ID",
    "Job Title",
    "Designation",
    "Department",
    "Company",
    "Location",
    "Posted On",
    "Status",
  ];

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
            item[field]?.toString().toLowerCase().includes(s),
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
              className="grid gap-4 px-6 py-4 border-t border-gray-100 hover:bg-blue-50/50 transition-colors cursor-pointer items-center min-w-max bg-white text-sm"
              style={{ gridTemplateColumns: columnWidths.join(" ") }}
              onClick={handleRowClick}
            >
              <div className="text-slate-800 font-medium truncate text-center">
                {item.opening_code || item.name}
              </div>
              <div className="flex items-center justify-center gap-1.5 min-w-0">
                <span className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer no-underline truncate block">
                  {item.job_title}
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
              <div className="text-slate-800 truncate text-center">
                {item.designation || "--"}
              </div>
              <div className="text-slate-800 truncate text-center">
                {item.department || "--"}
              </div>
              <div className="text-slate-800 truncate text-center">
                {item.company || "--"}
              </div>
              <div className="text-slate-800 truncate text-center">
                {item.location || "--"}
              </div>
              <div className="text-slate-800 truncate text-center">
                {formatToIndianDate(item.posted_on) || "--"}
              </div>
              <div className="flex justify-center items-center">
                {renderStatusBadge(item.status)}
              </div>
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
              {/* Header: ID + Status */}
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel">Opening ID</Typography>
                  <Typography variant="mobileCardValue">
                    {item.opening_code || item.name}
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

              {/* Job Title */}
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Job Title</Typography>
                <Typography variant="mobileCardValue" className="font-semibold text-gray-900">
                  {item.job_title}
                </Typography>
              </div>

              {/* Designation + Department */}
              <div className="flex justify-between w-full">
                <div className="flex flex-col gap-1 max-w-[50%]">
                  <Typography variant="mobileCardLabel">Designation</Typography>
                  <Typography variant="mobileCardValue" className="truncate">
                    {item.designation || "--"}
                  </Typography>
                </div>

                <div className="flex flex-col gap-1 text-right max-w-[50%]">
                  <Typography variant="mobileCardLabel">Department</Typography>
                  <Typography variant="mobileCardValue" className="truncate">
                    {item.department || "--"}
                  </Typography>
                </div>
              </div>

              {/* Company + Location */}
              <div className="flex justify-between w-full">
                <div className="flex flex-col gap-1 max-w-[50%]">
                  <Typography variant="mobileCardLabel">Company</Typography>
                  <Typography variant="mobileCardValue" className="truncate">
                    {item.company || "--"}
                  </Typography>
                </div>

                <div className="flex flex-col gap-1 text-right max-w-[50%]">
                  <Typography variant="mobileCardLabel">Location</Typography>
                  <Typography variant="mobileCardValue" className="truncate">
                    {item.location || "--"}
                  </Typography>
                </div>
              </div>

              {/* Posted On */}
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Posted On</Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate(item.posted_on) || "--"}
                </Typography>
              </div>
            </div>
          </div>
        );
      },
    [isDesktop, appliedIds, onSelectJob],
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
  const [appliedIds, setAppliedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("ijp_applied_ids");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleSelectJob = (job: JobType) => {
    setSelectedJob(job);
    setView("detail");
  };
  const handleApply = () => setView("apply");
  const handleBack = () => setView("list");
  const handleBackToDetail = () => setView("detail");

  const handleSubmitDone = useCallback((jobId: string) => {
    setAppliedIds((prev: string[]) => {
      const next = [...prev, jobId];
      try {
        localStorage.setItem("ijp_applied_ids", JSON.stringify(next));
      } catch {
        /* empty */
      }
      return next;
    });
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
