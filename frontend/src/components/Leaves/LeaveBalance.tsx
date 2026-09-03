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
  const showTotalLeavesCard = isActionEnabled(
    userUiPermission,
    "show_total_leaves_card",
    "Leave Summary",
  );
  const showAvailedLeavesCard = isActionEnabled(
    userUiPermission,
    "show_availed_leaves_card",
    "Leave Summary",
  );
  const showBalanceLeavesCard = isActionEnabled(
    userUiPermission,
    "show_balance_leaves_card",
    "Leave Summary",
  );
  const showCardTotalLeavesData = isActionEnabled(
    userUiPermission,
    "show_card_total_leaves_data",
    "Leave Summary",
  );
  const showAnySummaryCard = showTotalLeavesCard || showAvailedLeavesCard || showBalanceLeavesCard;

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
              {showAnySummaryCard && (
                <div className="flex justify-between items-center">
                  <Typography
                    variant="subheading"
                    color="title"
                    className="font-semibold"
                  >
                    Leave Summary
                  </Typography>
                </div>
              )}

              {showAnySummaryCard && (
                <div className="grid grid-cols-3 gap-4">
                  {showTotalLeavesCard && (
                    <div
                      className="rounded-xl flex flex-col items-center p-3 gap-2 bg-primary/10 border border-primary/20 transition-colors"
                    >
                      <span className="bg-card/90 rounded-lg w-12 h-12 flex items-center justify-center border border-border/50 shadow-xs">
                        <Calendar size={24} className="text-primary" />
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

                      <Typography
                        variant="bodySmall"
                        color="body2"
                        className="font-medium leading-none text-center"
                      >
                        Total Leaves
                      </Typography>
                    </div>
                  )}

                  {showAvailedLeavesCard && (
                    <div
                      className="rounded-xl flex flex-col items-center p-3 gap-2 bg-[#FFF4ED] dark:bg-[#2A1C12] border border-orange-200 dark:border-orange-900/50 transition-colors"
                    >
                      <span className="bg-card/90 rounded-lg w-12 h-12 flex items-center justify-center border border-border/50 shadow-xs">
                        <Plane size={24} className="text-orange-600 dark:text-orange-400" />
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

                      <Typography
                        variant="bodySmall"
                        color="body2"
                        className="font-medium leading-none text-center"
                      >
                        Availed Leaves
                      </Typography>
                    </div>
                  )}

                  {showBalanceLeavesCard && (
                    <div
                      className="rounded-xl flex flex-col items-center p-3 gap-2 bg-[#F0FDF4] dark:bg-[#0D281E] border border-emerald-200 dark:border-emerald-900/50 transition-colors"
                    >
                      <span className="bg-card/90 rounded-lg w-12 h-12 flex items-center justify-center border border-border/50 shadow-xs">
                        <Calendar size={24} className="text-emerald-600 dark:text-emerald-400" />
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

                      <Typography
                        variant="bodySmall"
                        color="body2"
                        className="font-medium leading-none text-center"
                      >
                        Balance Leaves
                      </Typography>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4 p-4">
              <div>
                <Typography
                  variant="subheading"
                  color="title"
                  className="font-semibold"
                >
                  Leave Balance
                </Typography>
                <Typography
                  variant="bodySmall"
                  color="body2"
                >
                  {isEmployeeInactive
                    ? `Balances as of Last Working Day ${formatToIndianDate(leaveBalanceDate)}`
                    : "Balances as of today"}
                </Typography>
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
                      className="border border-primary/20 rounded-2xl p-4 flex items-start gap-4 bg-card hover:border-primary/40 transition-colors cursor-pointer"
                      onClick={() => toggleTransactions(leave.type)}
                    >
                      <div className="bg-primary/10 rounded-lg p-3">
                        <Briefcase className="text-primary" size={20} />
                      </div>

                      <div className="flex-1">
                        <div className="flex flex-col justify-between items-start">
                          <div className="flex items-center gap-1 justify-between w-full">
                            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                              <Typography
                                variant="bodyMedium"
                                color="title"
                                className="font-semibold"
                              >
                                {leave.balance}
                              </Typography>
                              <Typography
                                variant="bodySmall"
                                color="body2"
                                className="truncate whitespace-nowrap max-w-[120px] overflow-hidden text-ellipsis cursor-pointer flex-shrink-0"
                                title={leave.type}
                              >
                                {leave.type}
                              </Typography>
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
                                className="text-gray-400 hover:text-primary transition-colors ml-auto mr-2.5"
                              >
                                <Plus size={18} />
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDrawer(leave);
                              }}
                              className="text-gray-400 hover:text-primary transition-colors"
                            >
                              <ScrollText size={18} />
                            </button>
                          </div>

                          {leave?.visibility_flags?.show_carry_over && (
                            <Typography
                              variant="bodySmall"
                              className="mr-2.5 text-primary whitespace-nowrap items-start"
                            >
                              <span className="font-semibold">
                                {leave.carry_over}
                              </span>{" "}
                              Carry Forwarded
                            </Typography>
                          )}
                        </div>

                        <div className="my-3 h-px bg-border" />

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Typography
                              variant="bodyMedium"
                              color="title"
                              className="font-semibold"
                            >
                              {leave.availed}
                            </Typography>
                            <Typography
                              variant="bodySmall"
                              color="body2"
                            >
                              Already taken
                            </Typography>
                          </div>

                          {showCardTotalLeavesData && (
                            <div>
                              <Typography
                                variant="bodyMedium"
                                color="title"
                                className="font-semibold"
                              >
                                {leave.entitled}
                              </Typography>
                              <Typography
                                variant="bodySmall"
                                color="body2"
                              >
                                Total Leaves
                              </Typography>
                            </div>
                          )}
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
