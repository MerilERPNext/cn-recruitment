import React from "react";
import { ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ApprovalList from "../shared/ApprovalList";
import { FaCheck, FaInfoCircle, FaMinusCircle } from "react-icons/fa";
import FrappeListView from "../ListView";
import ApprovalRejectionQueue from "./dashboard/ApprovalRejection";
import formatToIndianDate from "../../utils/formatToIndianDate";
import useCurrentUser from "../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import { MyShiftRequest } from "../../types/shift";
import EmpShiftRequestCard from "./EmpShiftRequestCard";
import DataListView from "../DataListView";
import CardTable from "../shared/CardTable";

// Interface for Shift Assignment (Team Shifts from Frappe)
export interface ShiftAssignment {
  name: string;
  employee: string;
  employee_name: string;
  shift_type: string;
  start_date: string;
  end_date: string;
  status: string;
  docstatus: number;
  creation: string;
}

export const StatusBadge = ({ status }: { status: string }) => {
  const baseStyle = "px-2 py-1 rounded-2xl text-xs inline-block";
  const statusStyles: { [key: string]: string } = {
    Open: "bg-blue-100 text-blue-800",
    Pending: "bg-yellow-100 text-yellow-800",
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

// CHANGED: Using our new .dashboard-card class
const Card = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`dashboard-card ${className}`}>{children}</div>;

// CHANGED: Using .card-header-title and .card-header-action
const CardHeader = ({
  title,
  onSeeAll,
}: {
  title: string;
  onSeeAll: () => void;
}) => (
  <div className="flex justify-between items-center mb-4">
    <h2 className="card-header-title">{title}</h2>
    <button onClick={onSeeAll} className="card-header-action" title="See All">
      <span>View All</span>
      <ExternalLink size={16} />
    </button>
  </div>
);

// My Shift Item Component
const MyShiftItem: React.FC<{
  item: ShiftAssignment;
  index?: number;
  doctype: string;
}> = ({ item }) => {

  const getShiftStatus = (startDate: string, endDate: string): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    if (today < start) {
      return "Upcoming";
    } else if (today > end) {
      return "Previous";
    } else {
      return "Current";
    }
  };

  const shiftStatus = getShiftStatus(item.start_date, item.end_date);

  // CHANGED: Using the reusable .list-item-card class
  return (
    <li className="list-item-card">
      <div>
        <p className="text-gray-600 font-semibold text-xs">
          {formatToIndianDate(item.start_date)} -{" "}
          {formatToIndianDate(item.end_date)}
        </p>
      </div>
      <StatusBadge status={shiftStatus} />
    </li>
  );
};

const MyShifts: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader
        title="My Shifts"
        onSeeAll={() => navigate("/webapp/shift-request/my-shift-assignment")}
      />
      <div className="max-h-96 overflow-y-auto my-shifts-dashboard">
        <FrappeListView
          doctype="Shift Assignment"
          ItemComponent={MyShiftItem}
          isSearch={false}
          orderBy="start_date"
          pageSize={3}
          defaultFields={[
            "name",
            "employee",
            "employee_name",
            "shift_type",
            "start_date",
            "end_date",
            "status",
            "docstatus",
            "creation",
          ]}
          searchFields={["employee", "employee_name", "shift_type", "status"]}
          showPagination={false}
        />
      </div>
    </Card>
  );
};

const TeamShiftItem: React.FC<{
  item: ShiftAssignment;
  index?: number;
  doctype: string;
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

  // CHANGED: Using the reusable .list-item-card class
  return (
    <div className="list-item-card">
      <div className="flex-grow">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-gray-900 text-xs font-semibold">
            {item.employee_name || item.employee}
          </h3>
        </div>
        <div className="text-xs text-gray-600">
          <p>Shift: <span className="font-medium">{item.shift_type}</span></p>
          <p>{formatToIndianDate(item.start_date)} - {formatToIndianDate(item.end_date)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <StatusBadge status={item.status} />
        <span className="flex items-center justify-center">{getStatusIcon(item.status)}</span>
      </div>
    </div>
  );
};

const TeamShiftList = () => {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader
        title="Team Shift List"
        onSeeAll={() => navigate("/webapp/shift-request/team-shift")}
      />
      <div className="max-h-96 overflow-y-auto team-shift-dashboard">
        <FrappeListView
          doctype="Shift Assignment"
          ItemComponent={TeamShiftItem}
          orderBy="start_date"
          pageSize={3}
          isSearch={false}
          defaultFields={[
            "name", "employee", "employee_name", "shift_type", "start_date", "end_date", "status", "docstatus", "creation",
          ]}
          searchFields={["employee", "employee_name", "shift_type", "status"]}
          showPagination={false}
        />
      </div>
    </Card>
  );
};

const MyShiftChangesRequest = () => {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
  const { refetchShift, setRefetchShift } = useGlobalStore();
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
      <div className="bg-white px-2 pb-4 rounded-lg mt-6">
        {/* Pending */}

        <div className="flex justify-between pt-4 mb-2 border-b-1 border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 pb-1">
            My Shift Requests
          </h2>
          <button
            onClick={() => {
              navigate("/webapp/shift-request/shift-change-request");
            }}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View All
          </button>
        </div>
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
              onRefetchComplete={() => {
                setRefetchShift(false);
              }}
              refetchTrigger={refetchShift}
              isSearch={false}
              isFilter={false}
              pageSize={3}
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
  return (
    <div className="bg-gray-100 min-h-screen font-sans text-sm">
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader
                title="Shift Change Request"
                onSeeAll={() => navigate("/webapp/shift-request/shift-change-request")}
              />
              <div className="border border-gray-200 rounded-lg">
                <div className="overflow-x-auto bg-white shadow-sm">
                  {/* CHANGED: Using .table-header and .table-header-text */}
                  <div className="table-header grid grid-cols-7 gap-4 rounded-t-lg">
                    <span className="table-header-text flex items-center">SELECT</span>
                    <span className="table-header-text flex items-center">EMPLOYEE</span>
                    <span className="table-header-text flex items-center">CREATION DATE</span>
                    <span className="table-header-text flex items-center">STATUS</span>
                    <span className="table-header-text flex items-center">PRIORITY</span>
                    <span className="table-header-text flex items-center">DUE DATE</span>
                    <span className="table-header-text flex items-center">ACTIONS</span>
                  </div>
                </div>
                <ApprovalList
                  doctype={"Shift Request"}
                  pageSize={3}
                  renderCardContent={(item) => (
                    <ApprovalRejectionQueue
                      isSelected={item?.isSelected}
                      onToggleSelect={item?.onToggleSelect}
                      data={item?.data}
                      onAction={item?.onAction}
                    />
                  )}
                />
              </div>
            </Card>
            <MyShiftChangesRequest />
          </div>
          <div className="space-y-6">
            <MyShifts />
            <TeamShiftList />
          </div>
        </div>
      </main>
    </div>
  );
}