import React from "react";
import { ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ApprovalList from "../shared/ApprovalList";
import { FaCheck, FaInfoCircle, FaMinusCircle } from "react-icons/fa";
import FrappeListView from "../ListView";
import ApprovalRejectionQueue from "./dashboard/ApprovalRejection";

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

const Card = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}
  >
    {children}
  </div>
);

const CardHeader = ({
  title,
  onSeeAll,
}: {
  title: string;
  onSeeAll: () => void;
}) => (
  <div className="flex justify-between items-center mb-4">
    <h2 className="font-semibold text-gray-800">{title}</h2>
    <button
      onClick={onSeeAll}
      className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors"
      title="See All"
    >
      <span>View All</span>
      <ExternalLink size={18} />
    </button>
  </div>
);
// My Shift Item Component
const MyShiftItem: React.FC<{
  item: ShiftAssignment;
  index?: number;
  doctype: string;
}> = ({ item }) => {
  const formatToIndianDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

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

  return (
    <li className="flex justify-between mb-2 bg-gray-50 items-center rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-100 transition">
      {/* Left section */}
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

  const formatToIndianDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <div className="flex justify-between items-center gap-3 bg-gray-50 p-3 mb-2 rounded-lg border cursor-pointer hover:bg-gray-100 transition-colors">
      <div className="flex-grow">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-gray-900 text-xs font-semibold">
            {item.employee_name || item.employee}
          </h3>
        </div>
        <div className="text-xs text-gray-600">
          <p>
            Shift: <span className="font-medium">{item.shift_type}</span>
          </p>
          <p>
            {formatToIndianDate(item.start_date)} -{" "}
            {formatToIndianDate(item.end_date)}
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
          pageSize={3}
          isSearch={false}
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

export default function AllShiftsDashboard() {
  const navigate = useNavigate();
  return (
    <div className="bg-gray-100 min-h-screen font-sans text-sm">
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 ">
            <Card>
              <CardHeader
                title="Shift Change Request"
                onSeeAll={() =>
                  navigate("/webapp/shift-request/shift-change-request")
                }
              />
              <div className="border border-gray-200 rounded-lg">
                <div className="overflow-x-auto bg-white shadow-sm">
                  {/* Header */}
                  <div className="grid grid-cols-7 gap-4 text-[11px] px-6 h-12 bg-gray-50 border-b border-gray-200 rounded-t-lg">
                    <span className="font-semibold  text-gray-500 flex items-center">
                      SELECT
                    </span>
                    <span className="font-semibold text-gray-500 flex items-center">
                      EMPLOYEE
                    </span>
                    <span className="font-semibold text-gray-500 flex items-center">
                      CREATION DATE
                    </span>
                    <span className="font-semibold text-gray-500 flex items-center">
                      STATUS
                    </span>
                    <span className="font-semibold text-gray-500 flex items-center">
                      PRIORITY
                    </span>
                    <span className="font-semibold text-gray-500 flex items-center">
                      DUE DATE
                    </span>
                    <span className="font-semibold text-gray-500 flex items-center justify-center">
                      ACTIONS
                    </span>
                  </div>
                </div>
                <ApprovalList
                  doctype={"Shift Request"}
                  pageSize={10}
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
            </Card>{" "}
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
