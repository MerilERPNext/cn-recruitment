"use client";
import type React from "react";
import { useState, useCallback } from "react";
import { useGetLeaveBalance } from "../../hooks/useLeaves";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { useEmployeeByUserId, useGetEmployeeDetailsByEmpId } from "../../hooks/useEmployee";
import { useTargetUser } from "../../context/ViewedUserContext";
import { LeaveBalanceSkeleton } from "./LeaveSkeletons";
import HeaderBar from "../HeaderBar";
import { useRequestLeaveModal } from "./RequestLeaveModalContext";
import LeaveTransactionsChart from "./LeaveTransactionsChart";
import {
  Briefcase,
  Calendar,
  Plane,
  Plus,
  ScrollText,
  ChevronDown,
} from "lucide-react";
import BalanceDetailsDrawer from "./LeaveBalance/BalanceDetailsDrawer";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled } from "../../utils/uiPermission";
import { Typography } from "../shared/atoms/Typography";
import { NoDataFound } from "../shared/atoms/NoDataFound";
import formatToIndianDate from "../../utils/formatToIndianDate";

type LeaveTransactionEntry = {
  type: string;
  name?: string;
  total: number;
  monthly: number[];
};

const monthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const LeaveTransactionCard: React.FC<{
  data: LeaveTransactionEntry[];
  defaultOpenType?: string | null;
}> = ({ data, defaultOpenType }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(() => {
    if (!defaultOpenType) return null;
    const defaultIdx = data.findIndex((d) => d.type === defaultOpenType);
    return defaultIdx > -1 ? defaultIdx : null;
  });

  const toggle = useCallback(
    (index: number) => setOpenIndex((prev) => (prev === index ? null : index)),
    [],
  );

  return (
    <div className="max-w-md md:max-w-full mx-auto pb-8">
      {data?.map((entry, idx) => (
        <div
          key={`${entry.type}-${idx}`}
          className="rounded-xl mb-2 hover:shadow-md"
        >
          <button
            type="button"
            aria-expanded={openIndex === idx}
            onClick={() => toggle(idx)}
            className={`w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 transition-all text-left hover:bg-gray-50 ${openIndex === idx ? "rounded-t-lg border-b-0" : "rounded-lg"
              }`}
          >
            <Typography
              variant="bodyMedium"
              color="title"
              className="font-medium"
            >
              {entry.name || entry.type}
            </Typography>

            <div className="flex items-center gap-2 text-gray-600">
              <Typography
                variant="bodyMedium"
                color="title"
                className="font-semibold"
              >
                {entry.total.toString()}
              </Typography>

              <ChevronDown
                className={`h-4 w-4 transition-transform ${openIndex === idx ? "rotate-180" : ""
                  }`}
              />
            </div>
          </button>

          {openIndex === idx && (
            // <div className="grid grid-cols-4 gap-2 p-4 bg-primary/10 rounded-b-xl">
            <div className="grid grid-cols-4 gap-3 px-4 py-3 bg-primary/5 rounded-b-xl border border-t-0 border-gray-200">
              {entry.monthly.map((count, mIdx) => (
                <div
                  key={`${entry.type}-${mIdx}`}
                  // className="text-sm text-center p-2 border rounded-lg bg-white"
                  className="text-xs text-center px-2 py-1.5 border border-gray-200 rounded-md bg-white"
                >
                  <Typography variant="bodyMedium" color="title">
                    {monthLabels[mIdx]}
                  </Typography>
                  <Typography variant="bodyMedium" color="primary">
                    {count}
                  </Typography>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const LeaveBalance: React.FC = () => {
  const [showTransactions, setShowTransactions] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedLeave, setSelectedLeave] = useState<any>(null);

  const { openModal } = useRequestLeaveModal();
  const { targetEmployeeId } = useTargetUser();
  const { data: userId, isLoading: isUserLoading } = useLoggedInUser({
    enabled: !targetEmployeeId,
  });
  const { data: currentEmployee, isLoading: isEmployeeLoading } =
    useEmployeeByUserId(targetEmployeeId ? undefined : userId);

  const { data: targetEmployee, isLoading: isTargetEmployeeLoading } =
    useGetEmployeeDetailsByEmpId(targetEmployeeId || "");

  const employee = targetEmployeeId ? targetEmployee : currentEmployee;

  const { data: userUiPermission } = useGetUiPermission("Leaves and Holidays");
  const canRequestLeave = isActionEnabled(
    userUiPermission,
    "lb_request_leave",
    "Leave Summary",
  );

  const today = new Date().toISOString().split("T")[0];

  const isUserOrEmployeeLoading = targetEmployeeId
    ? isTargetEmployeeLoading
    : isUserLoading || isEmployeeLoading;

  const employeeId = isUserOrEmployeeLoading
    ? ""
    : (targetEmployeeId || currentEmployee?.name || "");

  const isEmployeeInactive =
    employee?.status === "Inactive" && !!employee?.relieving_date;

  const leaveBalanceDate = isEmployeeInactive
    ? employee.relieving_date!
    : today;

  const {
    data,
    isLoading: isLeaveLoading,
    isError,
  } = useGetLeaveBalance(employeeId, leaveBalanceDate);

  const toggleTransactions = useCallback((type: string | null) => {
    setSelectedType(type);
    setShowTransactions((prev) => !prev);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleOpenDrawer = useCallback((leave: any) => {
    setSelectedLeave(leave);
    setIsDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedLeave(null);
  }, []);

  if (isUserOrEmployeeLoading || isLeaveLoading) {
    return <LeaveBalanceSkeleton />;
  }

  if (isError) {
    return (
      <div className="p-4 text-center text-red-600">
        Failed to load leave data
      </div>
    );
  }

  if (!data || !data.leave_balance || data.leave_balance.length === 0) {
    return (
      <div className="p-8">
        <NoDataFound
          title="No Leave Data Found"
          subtitle="No leave balance information is available for your account at this time."
        />
      </div>
    );
  }

  const leaveBalance = (data?.leave_balance ?? []).filter(
    (leave) => leave.dont_show_in_frontend !== 1,
  );

  const visibleTypes = leaveBalance.map((l) => l.leave_id);

  // Build a leave_id → leave type name mapping
  const leaveIdToName: Record<string, string> = {};
  leaveBalance.forEach((l) => {
    leaveIdToName[l.leave_id] = l.type;
  });

  const transactions = (data?.leave_transactions ?? [])
    .filter((t) => visibleTypes.includes(t.type))
    .map((t) => ({
      ...t,
      name: leaveIdToName[t.type] || t.type,
    }));

  return (
    <div className="pb-4 relative">
      <LeaveTransactionsChart data={transactions} />

      {selectedLeave && (
        <BalanceDetailsDrawer
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          leaveType={selectedLeave.type}
          leaveData={selectedLeave}
          leaveId={selectedLeave?.leave_id}
        />
      )}

      {showTransactions ? (
        <div className="fixed inset-0 z-50 flex flex-col md:static md:max-w-full">
          <HeaderBar
            title="Transactions History"
            onBack={() => toggleTransactions(null)}
          />
          <main className="flex-1 overflow-y-auto px-4">
            <LeaveTransactionCard
              data={transactions}
              defaultOpenType={selectedType}
            />
          </main>
        </div>
      ) : (
        <>
          <div className="md:pt-4 md:p-3">
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <Typography
                  variant="subheading"
                  color="title"
                  className="font-semibold"
                >
                  Leave Summary
                </Typography>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div
                  // style={{ backgroundColor: "#EFF6FF" }}
                  className="rounded-xl flex flex-col items-center p-3 gap-2 bg-primary/10"
                >
                  <span className="bg-white rounded-lg w-12 h-12 flex items-center justify-center">
                    <Calendar size={24} className="text-primary-600" />
                  </span>

                  <Typography
                    variant="bodyMedium"
                    color="title"
                    className="font-semibold leading-none mt-1"
                  >
                    {leaveBalance.reduce(
                      (sum, leave) => sum + (leave.entitled || 0),
                      0,
                    )}
                  </Typography>

                  <p className="text-sm text-gray-500 font-medium leading-none">
                    Total Leaves
                  </p>
                </div>

                <div
                  style={{ backgroundColor: "#FFF4ED" }}
                  className="rounded-xl flex flex-col items-center p-3 gap-2"
                >
                  <span className="bg-white rounded-lg w-12 h-12 flex items-center justify-center">
                    <Plane size={24} className="text-[#E17100]" />
                  </span>

                  <Typography
                    variant="bodyMedium"
                    color="title"
                    className="font-semibold leading-none mt-1"
                  >
                    {leaveBalance.reduce(
                      (sum, leave) => sum + (leave.availed || 0),
                      0,
                    )}
                  </Typography>

                  <p className="text-sm text-gray-500 font-medium leading-none">
                    Availed Leaves
                  </p>
                </div>

                <div
                  style={{ backgroundColor: "#F0FDF4" }}
                  className="rounded-xl flex flex-col items-center p-3 gap-2"
                >
                  <span className="bg-white rounded-lg w-12 h-12 flex items-center justify-center">
                    <Calendar size={24} className="text-[#00A63E]" />
                  </span>

                  <Typography
                    variant="bodyMedium"
                    color="title"
                    className="font-semibold leading-none mt-1"
                  >
                    {leaveBalance.reduce(
                      (sum, leave) => sum + (leave.balance || 0),
                      0,
                    )}
                  </Typography>

                  <p className="text-sm text-gray-500 font-medium leading-none">
                    Balance Leaves
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Leave Balance
                </h3>
                <p className="text-sm text-gray-500">
                  {isEmployeeInactive
                    ? `Balances as of Last Working Day ${formatToIndianDate(leaveBalanceDate)}`
                    : "Balances as of today"}
                </p>
              </div>
              {leaveBalance.length < 1 ? (
                <NoDataFound
                  title="No Leave Balance Available"
                  subtitle="There's no leave balance to show here right now."
                />
              ) : (
                <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(20rem,1fr))] ">
                  {leaveBalance.map((leave) => (
                    <div
                      key={leave?.type}
                      className="border border-primary/20 rounded-2xl p-4 flex items-start gap-4 bg-white"
                      onClick={() => toggleTransactions(leave.type)}
                    >
                      <div className="bg-primary/10 rounded-lg p-3">
                        <Briefcase className="text-primary-600" size={20} />
                      </div>

                      <div className="flex-1">
                        <div className="flex flex-col justify-between items-start">
                          <div className="flex items-center gap-1 justify-between w-full">
                            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                              <div className="text-base font-semibold text-gray-900">
                                {/* {leave.entitled} */}
                                {leave.balance}
                              </div>
                              <p
                                className="text-sm text-gray-600 truncate whitespace-nowrap max-w-[120px] overflow-hidden text-ellipsis cursor-pointer flex-shrink-0"
                                title={leave.type}
                              >
                                {leave.type}
                              </p>
                            </div>

                            {canRequestLeave && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openModal({
                                    source: "balances",
                                    leaveType: leave?.leave_id,
                                  });
                                }}
                                className="text-[#98A9CD] hover:text-[#98b1e6] ml-auto  mr-2.5"
                              >
                                <Plus size={18} />
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDrawer(leave);
                              }}
                              className="text-[#98A9CD] hover:text-[#98b1e6]"
                            >
                              <ScrollText size={18} />
                            </button>
                          </div>

                          {leave?.visibility_flags?.show_carry_over && (
                            <Typography
                              variant="bodySmall"
                              className=" mr-2.5 text-primary whitespace-nowrap items-start"
                            >
                              <span className="font-semibold">
                                {leave.carry_over}
                              </span>{" "}
                              Carry Forwarded
                            </Typography>
                          )}
                        </div>

                        <div className="my-3 h-px bg-primary/20" />

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {leave.availed}
                            </p>
                            <p className="text-xs text-gray-600">
                              Already taken
                            </p>
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {leave.entitled}
                            </p>
                            <p className="text-xs text-gray-600">
                              Total Leaves
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LeaveBalance;
