/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useCurrentUser from "../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import { useShiftAssignments } from "../../hooks/useShiftAssignments";
import { MyShiftRequest } from "../../types/shift";
import { ApiShiftAssignment } from "../../types/shiftAssignmentType";
import formatToIndianDate, {
  formatEndDate,
} from "../../utils/formatToIndianDate";
import DataListView from "../DataListView";
import ApprovalList from "../shared/ApprovalList";
import CardTable, { ColumnSortConfig } from "../shared/CardTable";
import { ViewAll } from "../shared/atoms/ViewAll";
import StatusBadge from "../shared/atoms/statusBadge";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";
import EmpShiftRequestCard from "./EmpShiftRequestCard";
import { ShiftDetailView } from "./ShiftDetailView";
import ApprovalRejectionQueue from "./dashboard/ApprovalRejection";

const COLUMN_SORT_CONFIG: ColumnSortConfig[] = [
  {
    sortable: true,
    type: "string",
    field: "shift_type",
    getValue: (item: MyShiftRequest) =>
      item.reference_document?.shift_type ?? "",
  },
  {
    sortable: true,
    type: "date",
    field: "from_date",
    getValue: (item: MyShiftRequest) =>
      item.reference_document?.from_date ?? "",
  },
  {
    sortable: true,
    type: "date",
    field: "to_date",
    getValue: (item: MyShiftRequest) =>
      item.reference_document?.to_date ?? "",
  },
  {
    sortable: false,
  },
  { sortable: false },
];

const BASE_COLUMN_SORT_CONFIG_TEAM: ColumnSortConfig[] = [
  { sortable: false },
  {
    sortable: true,
    type: "string",
    field: "shift_type",
    getValue: (item: MyShiftRequest) =>
      item.reference_document?.shift_type ?? "",
  },
  {
    sortable: true,
    type: "date",
    field: "from_date",
    getValue: (item: MyShiftRequest) =>
      item.reference_document?.from_date ?? "",
  },
  {
    sortable: true,
    type: "date",
    field: "to_date",
    getValue: (item: MyShiftRequest) =>
      item.reference_document?.to_date ?? "",
  },
  {
    sortable: true,
    type: "date",
    field: "due_date",
    getValue: (item: MyShiftRequest) => item?.due_date ?? "",
  },
  { sortable: false },
  { sortable: false },
];

const Card = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`my-dashboard-card ${className}`}>{children}</div>;

const CardHeader = ({
  title,
  onSeeAll,
}: {
  title: string;
  onSeeAll: () => void;
}) => (
  <div className="flex justify-between items-center mb-4">
    <h2 className="section-title">{title}</h2>
    <ViewAll title="View All" onClick={onSeeAll} />
  </div>
);

const MyShiftItem: React.FC<{
  item: ApiShiftAssignment;
  index?: number;
}> = ({ item }) => {
  return (
    <li className="my-list-item-card">
      <div className="text-xs text-gray-600">
        <p>
          <span className="font-medium">{item.shift_name}</span>
        </p>
        <p>
          <span className="font-medium">
            {item.start_time} - {item.end_time}
          </span>
        </p>
        <p>
          {formatToIndianDate(item.start_date)} - {formatEndDate(item.end_date)}
        </p>
      </div>
      <StatusBadge status={item?.shift_status} />
    </li>
  );
};

const MyShifts: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useShiftAssignments();

  const myShifts = data?.filter((s) => s.is_self === 1).slice(0, 4) ?? [];

  return (
    <Card>
      <CardHeader
        title="My Shift Assignments"
        onSeeAll={() => navigate("/webapp/shift-request/my-shift-assignment")}
      />
      <div className="max-h-96 overflow-y-auto my-shifts-dashboard">
        {isLoading ? (
          <CardSkeleton rows={3} />
        ) : (
          <ul>
            {myShifts.map((shift, idx) => (
              <MyShiftItem key={shift.name} item={shift} index={idx} />
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
};

const TeamShiftItem: React.FC<{
  item: ApiShiftAssignment;
  index?: number;
}> = ({ item }) => {
  return (
    <div className="my-list-item-card">
      <div className="flex-grow">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-gray-900 text-xs font-semibold">
            {item.employee_name || item.employee}
          </h3>
        </div>
        <div className="text-xs text-gray-600">
          <p>
            <span className="font-medium">{item.shift_name}</span>
          </p>
          <p>
            <span className="font-medium">
              {item.start_time} - {item.end_time}
            </span>
          </p>
          <p>
            {formatToIndianDate(item.start_date)} -{" "}
            {formatEndDate(item.end_date)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <StatusBadge status={item.status} />
      </div>
    </div>
  );
};

const TeamShiftList = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useShiftAssignments();
  const teamShifts = data?.filter((s) => s.is_self === 0).slice(0, 3) ?? [];
  return (
    <Card>
      <CardHeader
        title="Team Shift Assignments"
        onSeeAll={() => navigate("/webapp/shift-request/team-shift")}
      />
      <div className="max-h-96 overflow-y-auto team-shift-dashboard">
        {isLoading ? (
          <CardSkeleton rows={3} />
        ) : (
          <ul>
            {teamShifts.map((shift, idx) => (
              <TeamShiftItem key={shift.name} item={shift} index={idx} />
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
};

const AllMyShiftRequestsList = () => {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name ?? "",
    undefined,
    ["employee"],
  );
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();

  const handleRefetchComplete = useCallback(() => {
    setRefetchAttendance(false);
  }, [setRefetchAttendance]);

  return (
    <>
      <Card className="p-4 mt-6 border">
        <CardHeader
          title="My Shift Requests"
          onSeeAll={() => navigate("/webapp/shift-request/shift-list")}
        />
        <CardTable
          titles={["Shift Type", "From Date", "To Date", "Status", "Actions"]}
          columnWidths={["1fr", "1fr", "1fr", "1fr", "1fr"]}
          columnSortConfig={COLUMN_SORT_CONFIG}
        >
          {currentEmployee?.employee ? (
            <DataListView
              queryKey="shift-requests"
              customAPI={{
                method: "cn_leave_shift_managment.api.get_open_approval_todos",
                params: {
                  doctype: "Shift Request",
                  employee: currentEmployee?.employee,
                },
              }}
              ItemComponent={(props: { item: MyShiftRequest }) => {
                return (
                  <EmpShiftRequestCard
                    data={{
                      ...props?.item,
                    }}
                  />
                );
              }}
              SkeletonComponent={() => <CardSkeleton rows={3} />}
              onItemClick={(data) => {
                console.log(data);
              }}
              onRefetchComplete={handleRefetchComplete}
              refetchTrigger={refetchAttendance}
              isSearch={false}
              isFilter={false}
              defaultFilters={{ status: ["!=", "Cancelled"] }}
              pageSize={4}
              showRefreshButton={false}
              infiniteScroll={false}
              loadMorePagination={true}
              showPagination={false}
            />
          ) : (
            <></>
          )}
        </CardTable>
      </Card>
    </>
  );
};

export default function AllShiftsDashboard() {
  const navigate = useNavigate();
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);

  const [searchParams, setSearchParams] = useSearchParams();
  const requestId = searchParams.get("requestId");
  const referenceName = searchParams.get("reference_name");

  const handleRequestClick = useCallback(
    (request: any) => {
      if (request?.todo_id || request?.reference_name) {
        const params: Record<string, string> = {};
        if (request?.todo_id) params.requestId = request.todo_id;
        if (request?.reference_name)
          params.reference_name = request.reference_name;
        setSearchParams(params);
      }
    },
    [setSearchParams],
  );

  const handleCloseModal = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleActionComplete = useCallback(() => {
    setSearchParams({});
    // Trigger refetch after action
    setRefetchApprovalList(true);
  }, [setSearchParams]);

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const tableTitles = isBulkSelectEnabled
    ? [
      "Select",
      "Employee",
      "Shift Type",
      "From Date",
      "To Date",
      "Due Date",
      "Status",
      "Actions",
    ]
    : [
      "Employee",
      "Shift Type",
      "From Date",
      "To Date",
      "Due Date",
      "Status",
      "Actions",
    ];

  const tableColumnWidths = isBulkSelectEnabled
    ? ["0.5fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]
    : ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];

  const columnSortConfig = useMemo<ColumnSortConfig[]>(
    () =>
      isBulkSelectEnabled
        ? [{ sortable: false }, ...BASE_COLUMN_SORT_CONFIG_TEAM]
        : BASE_COLUMN_SORT_CONFIG_TEAM,
    [isBulkSelectEnabled],
  );

  return (
    <div className="h-screen pb-22 overflow-hidden font-sans text-sm">
      <main className="p-2 sm:p-2 lg:p-2 h-full overflow-y-auto">
        <div className="grid grid-cols-1 gap-6 min-h-0">
          <div>
            <Card>
              <CardHeader
                title="Team Shift Requests"
                onSeeAll={() =>
                  navigate("/webapp/shift-request/shift-change-request")
                }
              />
              <div className="border border-gray-100 rounded-lg overflow-x-auto">
                <CardTable
                  titles={tableTitles}
                  columnWidths={tableColumnWidths}
                  columnSortConfig={columnSortConfig}
                >
                  <ApprovalList
                    status="Draft"
                    doctype={"Shift Request"}
                    pageSize={4}
                    showPagination={false}
                    refetch={refetchApprovalList}
                    setRefetch={setRefetchApprovalList}
                    onApprovalRefetchComplete={handleApprovalRefetchComplete}
                    columnWidths={tableColumnWidths}
                    SkeletonComponent={() => <CardSkeleton rows={3} />}
                    onBulkSelectVisibilityChange={setIsBulkSelectEnabled}
                    renderCardContent={(item) => (
                      <ApprovalRejectionQueue
                        isSelected={item?.isSelected}
                        onToggleSelect={item?.onToggleSelect}
                        data={item?.data}
                        onAction={item?.onAction}
                        onClick={handleRequestClick}
                        loadingAction={item?.loadingAction}
                        isBulkSelectEnabled={isBulkSelectEnabled}
                      />
                    )}
                  />
                </CardTable>
              </div>
            </Card>
            {(requestId || referenceName) && (
              <ShiftDetailView
                documentName={requestId || ""}
                referenceName={referenceName || undefined}
                onClose={handleCloseModal}
                onAction={handleActionComplete}
              />
            )}

            <AllMyShiftRequestsList />
          </div>
          <div className="grid grid-cols-2 gap-6 mb-14 min-h-0">
            <MyShifts />
            <TeamShiftList />
          </div>
        </div>
      </main>
    </div>
  );
}
