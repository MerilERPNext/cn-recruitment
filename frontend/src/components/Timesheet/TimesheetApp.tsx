import { useState } from "react";
import { Plus } from "lucide-react";
import CardTable from "../shared/CardTable";
import { SortDirection } from "../shared/CardTableContext";
import FrappeListView from "../ListView";
import TimesheetItemRow from "./TimesheetItemRow";
import TimesheetCreationModal from "./TimesheetCreationModal";
import TimesheetDetailModal from "./TimesheetDetailModal";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import HeaderBar from "../HeaderBar";
import { useScreenSize } from "../../hooks/useScreenSize";
import Button from "../shared/atoms/Button";
import { Typography } from "../shared/atoms/Typography";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled } from "../../utils/uiPermission";
import { TimesheetListRecord } from "../../types/timesheet";

const TimesheetApp = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTimesheetId, setSelectedTimesheetId] = useState<TimesheetListRecord | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(false);
  const [orderBy, setOrderBy] = useState("`tabTimesheet`.creation desc");
  const { isDesktop } = useScreenSize();

  const { data: userUiPermission } = useGetUiPermission("Timesheet");
  const canCreateTimesheet = isActionEnabled(userUiPermission, "create_timesheet", "Timesheet");

  const handleSortChange = (field: string, direction: SortDirection) => {
    if (!direction) {
      setOrderBy("`tabTimesheet`.creation desc");
    } else {
      setOrderBy(`\`tabTimesheet\`.${field} ${direction}`);
    }
  };

  const actionButton = canCreateTimesheet ? (
    <Button
      variant="contain"
      bgColor="primary"
      size="md"
      icon={<Plus className="h-5 w-5" />}
      onClick={() => setIsModalOpen(true)}
      className="rounded-full shadow-lg"
    >
      Create Timesheet
    </Button>
  ) : null;

  const COLUMN_SORT_CONFIG = [
    { sortable: true, type: "string" as const, field: "name", getValue: (item: TimesheetListRecord) => item.name },
    { sortable: true, type: "string" as const, field: "employee_name", getValue: (item: TimesheetListRecord) => item.employee_name || item.employee || "" },
    { sortable: true, type: "string" as const, field: "company", getValue: (item: TimesheetListRecord) => item.company || "" },
    { sortable: true, type: "string" as const, field: "customer", getValue: (item: TimesheetListRecord) => item.customer || "" },
    { sortable: true, type: "string" as const, field: "parent_project", getValue: (item: TimesheetListRecord) => item.parent_project || "" },
    { sortable: true, type: "date" as const, field: "start_date", getValue: (item: TimesheetListRecord) => item.start_date || "" },
    { sortable: true, type: "date" as const, field: "end_date", getValue: (item: TimesheetListRecord) => item.end_date || "" },
    { sortable: true, type: "number" as const, field: "total_hours", getValue: (item: TimesheetListRecord) => String(item.total_hours || 0) },
    { sortable: true, type: "string" as const, field: "status", getValue: (item: TimesheetListRecord) => item.status || "" },
  ];

  const MainContent = (
    <div className="flex flex-col h-full">
      {isDesktop && (
        <div className="flex-shrink-0">
          <div className="px-6 py-1 md:py-4">
            <Typography variant="h4">Timesheets</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage employee timesheets
            </Typography>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto md:px-4 sm:pb-20 ">
        <CardTable
          columnWidths={["1fr", "1.5fr", "1.5fr", "1.5fr", "1.5fr", "1fr", "1fr", "1fr", "1fr"]}
          titles={["Timesheet ID", "Employee", "Company", "Customer", "Project", "Start Date", "End Date", "Total Hours", "Status"]}
          columnSortConfig={COLUMN_SORT_CONFIG}
          onSortChange={handleSortChange}
        >
          <FrappeListView
            doctype="Timesheet"
            ItemComponent={TimesheetItemRow}
            defaultFields={[
              "name", "status", "start_date", "end_date", "total_hours", "employee", "employee_name",
              "company", "customer", "parent_project", "exchange_rate",
              "parent_project.project_name", "customer.customer_name"
            ]}
            searchFields={["name", "employee", "employee_name", "company", "status"]}
            orderBy={orderBy}
            pageSize={20}
            refetchTrigger={refreshTrigger}
            onRefetchComplete={() => setRefreshTrigger(false)}
            isSearch={true}
            isFilter={false}
            onItemClick={(item) => setSelectedTimesheetId(item)}
          />
        </CardTable>
        {isModalOpen && (
          <TimesheetCreationModal
            onClose={() => setIsModalOpen(false)}
            onSuccess={() => setRefreshTrigger(true)}
          />
        )}
        {selectedTimesheetId && (
          <TimesheetDetailModal
            timesheetId={selectedTimesheetId.name}
            listItem={selectedTimesheetId}
            onClose={() => setSelectedTimesheetId(null)}
          />
        )}
      </div>
    </div>
  );

  // DisktopLayout
  if (isDesktop) {
    return (
      <DesktopLayoutWrapper title="Timesheets" actionButton={actionButton}>
        <div className="flex flex-col h-full bg-app project-theme-wrapper">
          {MainContent}
        </div>
      </DesktopLayoutWrapper>
    );
  }

  // MobileLayout
  return (
    <div className="flex flex-col h-screen bg-gray-60 project-theme-wrapper">
      <div className="sticky top-0 z-50 bg-white border-b">
        <HeaderBar title="Timesheets" />
      </div>

      <main className="flex-1 overflow-y-auto px-4 pt-2">
        {MainContent}
      </main>

      {canCreateTimesheet && (
        <div className="sticky bottom-0 bg-white border-t shadow-lg py-4 px-4 w-full">
          <div className="max-w-4xl mx-auto flex space-x-4">
            <Button
              size="lg"
              onClick={() => setIsModalOpen(true)}
              className="hover:bg-blue-700 flex-1"
            >
              + Create Timesheet
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetApp;

