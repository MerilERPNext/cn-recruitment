import { Upload } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { errorResponseFormater } from "../../utils/errorResponseFormater";

import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { scheduledImportsService } from "../../services/scheduledImportsService";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { useScheduledImports } from "../../hooks/useScheduledImports";
import { useScreenSize } from "../../hooks/useScreenSize";
import type {
  ImportStatusSummary,
  ScheduledDataImport,
} from "../../types/scheduledImports";
import Button from "../shared/atoms/Button";
import { NoDataFound } from "../shared/atoms/NoDataFound";
import { Typography } from "../shared/atoms/Typography";
import CardTable from "../shared/CardTable";

import ImportMobileCard from "./ImportMobileCard";
import ImportTableRow from "./ImportTableRow";
import ImportTableSkeleton from "./ImportTableSkeleton";

import { COLUMN_SORT_CONFIG_SCHEDULED_IMPORTS } from "../../utils/tableSortConfig";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import HeaderBar from "../HeaderBar";
import FrappeListView from "../ListView";
import ImportSummaryCards from "./ImportSummaryCards";
import { useTargetUser } from "../../context/ViewedUserContext";
import { useEmployee } from "../../hooks/useEmployee";


const MODULE_PERMISSION_KEY = "Scheduled Imports";

const COLUMN_TITLES = [
  "Import ID",
  "Import Name",
  "Source",
  "File Name",
  "Initiated On",
  "Initiated By",
  "Scheduled Time",
  "Status",
  "Summary",
  "Actions",
];

const COLUMN_WIDTHS = [
  "1fr",
  "1fr",
  "1fr",
  "1fr",
  "1fr",
  "1fr",
  "1fr",
  "1fr",
  "1fr",
  "1fr",
];

const ScheduledImportsPage: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const { targetEmployeeId } = useTargetUser();
  const { data: targetEmployee } = useEmployee(targetEmployeeId);
  const { data: loggedInUserId } = useLoggedInUser();
  const targetedEmployeeIdValue = targetEmployee?.company_email || targetEmployee?.prefered_email;

  const owner = targetEmployeeId ? targetedEmployeeIdValue : loggedInUserId;

  const { data: uiPermissions } = useGetUiPermission();

  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [orderBy, setOrderBy] = useState<string>("creation desc");

  const { data: allImports = [] } = useScheduledImports(owner ?? "", monthFilter);

  const hasPermission = useMemo(() => {
    if (!uiPermissions || uiPermissions.length === 0) return false;
    const appPerm = uiPermissions.find(
      (p) => p.app_name === MODULE_PERMISSION_KEY,
    );
    return appPerm?.enabled;
  }, [uiPermissions]);

  const summary: ImportStatusSummary = useMemo(() => {
    return allImports.reduce<ImportStatusSummary>(
      (acc, item) => {
        acc.total += 1;
        if (item.status === "Draft") acc.pendingApproval += 1;
        else if (item.status === "Processing") acc.processing += 1;
        else if (item.status === "Processed") acc.processed += 1;
        else if (item.status === "Scheduled") acc.pendingScheduled += 1;
        else if (item.status === "Failed" || item.status === "Cancelled")
          acc.failedCancelled += 1;
        return acc;
      },
      {
        total: 0,
        pendingApproval: 0,
        pendingScheduled: 0,
        processing: 0,
        processed: 0,
        failedCancelled: 0,
      },
    );
  }, [allImports]);

  // Reset to first page on filter/search change
  const handleFilterChange = useCallback((filter: string) => {
    setActiveFilter(filter);
  }, []);

  const handleImport = useCallback(() => {
    window.location.href =
      "/app/scheduled-data-import/new-scheduled-data-import";
  }, []);

  const handleErrorReport = useCallback(async (item: ScheduledDataImport) => {
    try {
      await scheduledImportsService.downloadErrorReport(item);
    } catch (error) {
      toast.error(errorResponseFormater(error) as any);
    }
  }, []);

  const handleDownloadFile = useCallback((item: ScheduledDataImport) => {
    if (!item.file_to_import) return;
    const url = `${window.location.origin}${item.file_to_import}`;
    const link = document.createElement("a");
    link.href = url;
    link.download = item.file_to_import.split("/").pop() ?? "import_file";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  if (!hasPermission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <NoDataFound
          title="Access Restricted"
          subtitle="You do not have permission to view Scheduled Imports. Please contact your administrator."
        />
      </div>
    );
  }

  const content = (
    <div className="space-y-5 p-4 md:p-6 w-full max-w-full overflow-hidden">
      {/* Page Header */}
      {!isDesktop && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Typography
              variant="h3"
              component="h1"
              color="title"
              className="font-bold"
            >
              Imports Center
            </Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage all your scheduled data imports
            </Typography>
          </div>

          {/* Top-right: Filter and Import button */}
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <input
                type="month"
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-700"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
              />
            </div>
            <Button
              size="md"
              bgColor="primary"
              onClick={handleImport}
              className="flex items-center gap-2"
            >
              <Upload size={16} />
              Import
            </Button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <ImportSummaryCards
        summary={summary}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
      />

      {/* Desktop View with ListView wrapped in CardTable */}
      {isDesktop ? (
        <div className="flex-1 w-full max-w-full overflow-hidden">
          <CardTable
            titles={COLUMN_TITLES}
            columnWidths={COLUMN_WIDTHS}
            columnSortConfig={COLUMN_SORT_CONFIG_SCHEDULED_IMPORTS}
            onSortChange={(field, direction) => {
              if (direction) {
                setOrderBy(`${field} ${direction}`);
              } else {
                setOrderBy("creation desc");
              }
            }}
          >
            <FrappeListView
              doctype="Scheduled Data Import"
              defaultFields={[
                "name",
                "import_type",
                "file_to_import",
                "started_at",
                "creation",
                "owner",
                "schedule_the_import",
                "status",
                "import_log",
                "failed_records_count",
              ]}
              searchFields={[
                "name",
                "import_type",
                "file_to_import",
                "owner",
                "status",
              ]}
              defaultFilters={(() => {
                const filters: Record<string, any> = {};
                if (owner) filters.owner = owner;
                if (activeFilter === "pending-approval")
                  filters.status = "Draft";
                else if (activeFilter === "pending-scheduled")
                  filters.status = "Scheduled";
                else if (activeFilter === "processing")
                  filters.status = "Processing";
                else if (activeFilter === "processed")
                  filters.status = "Processed";
                else if (activeFilter === "rejected-failed")
                  filters.status = ["in", ["Failed", "Cancelled"]];

                if (monthFilter) {
                  const [year, month] = monthFilter.split("-");
                  const startDate = `${year}-${month}-01`;
                  const lastDay = new Date(Number(year), Number(month), 0);
                  const endDate = `${year}-${month}-${String(lastDay.getDate()).padStart(2, "0")}`;
                  filters.creation = ["between", [startDate, endDate]];
                }

                return filters as any;
              })()}
              orderBy={orderBy}
              pageSize={20}
              isFilter={false}
              isSearch={true}
              SkeletonComponent={ImportTableSkeleton}
              ItemComponent={({ item }: { item: any }) => (
                <ImportTableRow
                  item={item}
                  columnWidths={COLUMN_WIDTHS}
                  onErrorReport={handleErrorReport}
                  onDownloadFile={handleDownloadFile}
                />
              )}
            />
          </CardTable>
        </div>
      ) : (
        <div className="flex-1 w-full max-w-full overflow-hidden">
          <FrappeListView
            doctype="Scheduled Data Import"
            defaultFields={[
              "name",
              "import_type",
              "file_to_import",
              "started_at",
              "creation",
              "owner",
              "schedule_the_import",
              "status",
              "import_log",
            ]}
            searchFields={[
              "name",
              "import_type",
              "file_to_import",
              "owner",
              "status",
            ]}
            defaultFilters={(() => {
              const filters: Record<string, any> = {};
              if (owner) filters.owner = owner;
              if (activeFilter === "pending-approval")
                filters.status = "Draft";
              else if (activeFilter === "pending-scheduled")
                filters.status = "Scheduled";
              else if (activeFilter === "processing")
                filters.status = "Processing";
              else if (activeFilter === "processed")
                filters.status = "Processed";
              else if (activeFilter === "rejected-failed")
                filters.status = ["in", ["Failed", "Cancelled"]];

              if (monthFilter) {
                const [year, month] = monthFilter.split("-");
                const startDate = `${year}-${month}-01`;
                const lastDay = new Date(Number(year), Number(month), 0);
                const endDate = `${year}-${month}-${String(lastDay.getDate()).padStart(2, "0")}`;
                filters.creation = ["between", [startDate, endDate]];
              }

              return filters as any;
            })()}
            orderBy={orderBy}
            pageSize={20}
            isFilter={false}
            isSearch={true}
            SkeletonComponent={ImportTableSkeleton}
            ItemComponent={({ item }: { item: any }) => (
              <ImportMobileCard
                item={item}
                onErrorReport={handleErrorReport}
                onDownloadFile={handleDownloadFile}
              />
            )}
          />
        </div>
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <DesktopLayoutWrapper title="Imports Center">
        <div className="flex justify-center h-full w-full">
          <div className="flex flex-col gap-2 w-full p-4">
            <div className="flex justify-between items-center px-2">
              <div>
                <Typography
                  variant="h3"
                  component="h1"
                  color="title"
                  className="font-bold"
                >
                  Imports Center
                </Typography>
                <Typography variant="bodySmall" color="body2">
                  Track and manage all your scheduled data imports
                </Typography>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center">
                  <input
                    type="month"
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-700"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                  />
                </div>
                <Button
                  size="md"
                  bgColor="primary"
                  onClick={handleImport}
                  className="flex items-center gap-2"
                >
                  <Upload size={16} />
                  Import
                </Button>
              </div>
            </div>
            {content}
          </div>
        </div>
      </DesktopLayoutWrapper>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <HeaderBar title="Imports Center" />
      </header>
      <main className="flex-grow flex flex-col w-full max-w-full overflow-hidden">
        {content}
      </main>
    </div>
  );
};

export default ScheduledImportsPage;
