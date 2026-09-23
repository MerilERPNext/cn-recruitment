import React from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, FileText, ReceiptIndianRupee, AlertCircle } from "lucide-react";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import { useMyPendingTaskCounts } from "../../hooks/useTasks";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import HeaderBar from "../HeaderBar";
import { TaskRequestRow } from "./TaskRequestRow";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";

export const TasksPage: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();

  const { data: user, isLoading: userLoading } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });

  const employeeId = user?.name || user?.employee || "";

  const {
    attendanceCount,
    leaveCount,
    expenseCount,
    isLoading: countsLoading,
    isError,
    error,
    refetch,
  } = useMyPendingTaskCounts(employeeId);

  const isLoading = userLoading || (Boolean(employeeId) && countsLoading);

  const handleNavigate = (route: string, state?: Record<string, unknown>) => {
    if (state) {
      navigate(route, { state });
    } else {
      navigate(route);
    }
  };

  const taskItems = [
    {
      id: "attendance",
      label: "Attendance Adjustment Raised by me",
      count: attendanceCount,
      icon: FileText,
      onClick: () => handleNavigate("/webapp/attendance/attendance-request"),
    },
    {
      id: "leave",
      label: "Leave Requests Raised by me",
      count: leaveCount,
      icon: Calendar,
      onClick: () => handleNavigate("/webapp/leave-app/leaves/leave-requests/my"),
    },
    {
      id: "expense",
      label: "Expense Claims Raised by me",
      count: expenseCount,
      icon: ReceiptIndianRupee,
      onClick: () =>
        handleNavigate("/webapp/expenses-app/expenses-list", {
          initialFilter: "Pending",
        }),
    },
  ];

  const content = (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 md:py-6">
      {/* Header section */}
      <div className="mb-6">
        <Typography variant="h3" color="title" className="font-bold text-gray-900">
          My Requests
        </Typography>
        <Typography variant="bodySmall" color="body2" className="mt-1 text-gray-500">
          Pending approval requests raised by you
        </Typography>
      </div>

      {/* Error state */}
      {isError && (
        <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <Typography variant="bodySmall" color="error">
              {(error as Error)?.message || "Failed to load some request counts."}
            </Typography>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {/* Loading state skeleton */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="animate-pulse bg-white border border-gray-100 rounded-2xl p-4 md:p-5 shadow-xs flex items-center justify-between"
            >
              <div className="flex items-center gap-3 w-2/3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex-shrink-0" />
                <div className="h-4 bg-gray-100 rounded-md w-3/4" />
                <div className="h-4 w-6 bg-gray-100 rounded-full" />
              </div>
              <div className="w-4 h-4 bg-gray-100 rounded-md" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {taskItems.map((item) => (
            <TaskRequestRow
              key={item.id}
              label={item.label}
              count={item.count}
              icon={item.icon}
              onClick={item.onClick}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <DesktopLayoutWrapper title="Tasks">
        <div className="overflow-y-auto h-full bg-slate-50/50">
          {content}
        </div>
      </DesktopLayoutWrapper>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
      <HeaderBar title="Tasks" />
      <div className="flex-1 overflow-y-auto">
        {content}
      </div>
    </div>
  );
};

export default TasksPage;
