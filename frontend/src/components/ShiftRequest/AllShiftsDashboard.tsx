import React, { useCallback, useState } from "react";
import { ExternalLink } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ApprovalList from "../shared/ApprovalList";
import { FaCheck, FaInfoCircle, FaMinusCircle } from "react-icons/fa";
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
import getShiftStatus from "../../utils/getShiftStatus";
import { ViewAll } from "../shared/atoms/ViewAll";

export const StatusBadge = ({ status }: { status: string }) => {
  const baseStyle = "px-2 py-1 rounded-2xl text-xs inline-block";
  const statusStyles: { [key: string]: string } = {
    Open: "bg-blue-100 text-blue-800",
    Pending: "bg-yellow-100 text-yellow-800",
    Draft: "bg-yellow-100 text-yellow-800",
    Rejected: "bg-red-100 text-red-800",
    Completed: "bg-blue-100 text-blue-800",
    Current: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    Upcoming: "bg-blue-100 text-blue-700 border border-blue-200",
    Previous: "bg-slate-100 text-slate-600 border border-slate-300",
    Active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    Inactive: "bg-gray-100 text-gray-600 border border-gray-300",
  };
  return (
    <span
      className={`${baseStyle} ${
        statusStyles[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {status}
    </span>
  );
};

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
  const shiftStatus = getShiftStatus(item.start_date, item.end_date);

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
      <StatusBadge status={shiftStatus} />
    </li>
  );
};

const MyShifts: React.FC = () => {
  const navigate = useNavigate();
  const { data } = useShiftAssignments();
  const myShifts = data?.filter((s) => s.is_self === 1).slice(0, 4) ?? [];

  return (
    <Card>
      <CardHeader
        title="My Shifts"
        onSeeAll={() => navigate("/webapp/shift-request/my-shift-assignment")}
      />
      <div className="max-h-96 overflow-y-auto my-shifts-dashboard">
        <ul className="max-h-96 overflow-y-auto my-shifts-dashboard">
          {myShifts.map((shift, idx) => (
            <MyShiftItem key={shift.name} item={shift} index={idx} />
          ))}
        </ul>
      </div>
    </Card>
  );
};

const TeamShiftItem: React.FC<{
  item: ApiShiftAssignment;
  index?: number;
}> = ({ item }) => {
  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "approved":
        return <FaCheck className="ml-1 text-green-600 w-3 h-3" />;
      case "pending":
        return <FaInfoCircle className="ml-1 text-yellow-600 w-3 h-3" />;
      case "rejected":
      case "inactive":
        return <FaMinusCircle className="ml-1 text-red-600 w-3 h-3" />;
      default:
        return null;
    }
  };

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
        <span className="flex items-center justify-center">
          {getStatusIcon(item.status)}
        </span>
      </div>
    </div>
  );
};

const TeamShiftList = () => {
  const navigate = useNavigate();
  const { data } = useShiftAssignments();
  const teamShifts = data?.filter((s) => s.is_self === 0).slice(0, 3) ?? [];
  return (
    <Card>
      <CardHeader
        title="Team Shift List"
        onSeeAll={() => navigate("/webapp/shift-request/team-shift")}
      />
      <div className="max-h-96 overflow-y-auto team-shift-dashboard">
        <ul className="max-h-96 overflow-y-auto my-shifts-dashboard">
          {teamShifts.map((shift, idx) => (
            <TeamShiftItem key={shift.name} item={shift} index={idx} />
          ))}
        </ul>
      </div>
    </Card>
  );
};

const AllMyShiftRequestsList = () => {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name ?? ""
  );
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();

  const handleRefetchComplete = useCallback(() => {
    setRefetchAttendance(false);
  }, [setRefetchAttendance]);
  const CardSkeleton = () => (
    <div className="rounded-xl bg-gray-100 animate-pulse my-4">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between gap-1">
          <div>
            <div className="h-4 w-32 bg-gray-300 rounded mb-2"></div>
            <div className="h-3 w-24 bg-gray-300 rounded"></div>
          </div>
          <div className="h-6 w-16 bg-gray-300 rounded-md"></div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="bg-white p-6 rounded-lg mt-6">
        <CardHeader
          title="My Shift Requests"
          onSeeAll={() => navigate("/webapp/shift-request/shift-list")}
        />
        <CardTable
          titles={["Shift Type", "From Date", "To Date", "Status", "Actions"]}
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
              SkeletonComponent={CardSkeleton}
              onItemClick={(data) => {
                console.log(data);
              }}
              onRefetchComplete={handleRefetchComplete}
              refetchTrigger={refetchAttendance}
              isSearch={false}
              isFilter={false}
              pageSize={4}
              showRefreshButton={false}
              orderBy="modified desc"
              infiniteScroll={false}
              loadMorePagination={true}
              showPagination={false}
            />
          ) : (
            <></>
          )}
        </CardTable>
      </div>
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
    [setSearchParams]
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

  return (
    <div className="bg-gray-100 min-h-screen font-sans text-sm">
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <Card>
              <CardHeader
                title="Shift Change Request"
                onSeeAll={() =>
                  navigate("/webapp/shift-request/shift-change-request")
                }
              />
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <CardTable
                  titles={[
                    "Select",
                    "Employee",
                    "Shift Type",
                    "From Date",
                    "To Date",
                    "Due Date",
                    "Status",
                    "Actions",
                  ]}
                  columnWidths={[
                    "8%",
                    "10%",
                    "10%",
                    "10%",
                    "10%",
                    "10%",
                    "10%",
                    "20%",
                  ]}
                >
                  <ApprovalList
                    status="Draft"
                    doctype={"Shift Request"}
                    pageSize={4}
                    showPagination={false}
                    refetch={refetchApprovalList}
                    setRefetch={setRefetchApprovalList}
                    onApprovalRefetchComplete={handleApprovalRefetchComplete}
                    renderCardContent={(item) => (
                      <ApprovalRejectionQueue
                        isSelected={item?.isSelected}
                        onToggleSelect={item?.onToggleSelect}
                        data={item?.data}
                        onAction={item?.onAction}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          <div className="grid grid-cols-2 gap-6 mb-14">
            <MyShifts />
            <TeamShiftList />
          </div>
        </div>
      </main>
    </div>
  );
}
