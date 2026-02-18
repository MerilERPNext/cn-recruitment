/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ApprovalList from "../shared/ApprovalList";
import ApprovalRejectionQueue from "./dashboard/ApprovalRejection";
import formatToIndianDate, {
  formatEndDate,
} from "../../utils/formatToIndianDate";
import useCurrentUser from "../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import { MyShiftRequest } from "../../types/shift";
import EmpShiftRequestCard from "./EmpShiftRequestCard";
import DataListView from "../DataListView";
import CardTable from "../shared/CardTable";
import { ApiShiftAssignment } from "../../types/shiftAssignmentType";
import { useShiftAssignments } from "../../hooks/useShiftAssignments";
import { ShiftDetailView } from "./ShiftDetailView";
import { ViewAll } from "../shared/atoms/ViewAll";
import StatusBadge from "../shared/atoms/statusBadge";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";

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
          <span className="font-medium">{item.shift_type}</span>
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
        title="My Shift"
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
            <span className="font-medium">{item.shift_type}</span>
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
        title="Team Shift List"
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
          titles={["Shift Type", "From Date", "To Date", "Status", "ACTIONS"]}
          columnWidths={["1fr", "1fr", "1fr", "1fr", "1fr"]}
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
              pageSize={4}
              showRefreshButton={false}
              orderBy="from_date desc"
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

  const [searchParams, setSearchParams] = useSearchParams();
  const requestId = searchParams.get("requestId");

  const handleRequestClick = useCallback(
    (request: any) => {
      if (request?.todo_id) {
        setSearchParams({ requestId: request.todo_id });
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

  const tableTitles = [
    "Select",
    "Employee",
    "Shift Type",
    "From Date",
    "To Date",
    "Due Date",
    "Status",
    "ACTIONS",
  ];

  const tableColumnWidths = [
    "0.5fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
  ];

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
                    orderBy="from_date desc"
                    SkeletonComponent={() => <CardSkeleton rows={3} />}
                    renderCardContent={(item) => (
                      <ApprovalRejectionQueue
                        isSelected={item?.isSelected}
                        onToggleSelect={item?.onToggleSelect}
                        data={item?.data}
                        onAction={item?.onAction}
                        onClick={handleRequestClick}
                        loadingAction={item?.loadingAction}
                      />
                    )}
                  />
                </CardTable>
              </div>
            </Card>
            {requestId && (
              <ShiftDetailView
                documentName={requestId}
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
