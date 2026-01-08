"use client";
import type React from "react";
import { useState, useCallback } from "react";
import { useGetLeaveBalance } from "../../hooks/useLeaves";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { useEmployeeByUserId } from "../../hooks/useEmployee";
import { LeaveBalanceSkeleton } from "./LeaveSkeletons";
import { FaRegCalendarCheck } from "react-icons/fa";
import { FaClockRotateLeft } from "react-icons/fa6";
import { FiPieChart } from "react-icons/fi";
import HeaderBar from "../HeaderBar";
import { useRequestLeaveModal } from "./RequestLeaveModalContext";
import LeaveTransactionsChart from "./LeaveTransactionsChart";
import { EllipsisVertical, ListChecks, Plus } from "lucide-react";
import DropdownMenu from "../shared/DropDownMenu";
import BalanceDetailsDrawer from "./LeaveBalance/BalanceDetailsDrawer";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled } from "../../utils/uiPermission";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";

type LeaveTransactionEntry = {
  type: string;
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
    []
  );

  return (
    <div className="max-w-md md:max-w-full mx-auto pb-8">
      {data.map((entry, idx) => (
        <div
          key={`${entry.type}-${idx}`}
          className="rounded-xl mb-2 hover:shadow-md"
        >
          <button
            type="button"
            aria-expanded={openIndex === idx}
            className="w-full flex justify-between items-center p-4 rounded-t-xl bg-white"
            onClick={() => toggle(idx)}
          >
            <Typography variant="subheading" color="title">
              {entry.type}
            </Typography>

            <Typography variant="subheading" color="title">
              {entry.total.toString()}
            </Typography>
          </button>

          {openIndex === idx && (
            <div className="grid grid-cols-4 gap-2 p-4 bg-primary/10 rounded-b-xl">
              {entry.monthly.map((count, mIdx) => (
                <div
                  key={`${entry.type}-${mIdx}`}
                  className="text-sm text-center p-2 border rounded-lg bg-white"
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
  const { data: userId, isLoading: isUserLoading } = useLoggedInUser();
  const { data: currentEmployee, isLoading: isEmployeeLoading } =
    useEmployeeByUserId(userId);

  const { data: userUiPermission } = useGetUiPermission("Leaves and Holidays");
  const canRequestLeave = isActionEnabled(
    userUiPermission,
    "lb_request_leave",
    "Leave Balance"
  );

  const today = new Date().toISOString().split("T")[0];
  const employeeId = currentEmployee?.name ?? "";
  const {
    data,
    isLoading: isLeaveLoading,
    isError,
  } = useGetLeaveBalance(employeeId, today);

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

  if (isUserLoading || isEmployeeLoading || isLeaveLoading) {
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
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No Leave Data Found
          </h3>
          <p className="text-gray-500 mb-6">
            No leave balance information is available for your account at this
            time.
          </p>
          <div className="w-full"></div>
        </div>
      </div>
    );
  }

  const leaveBalance = (data?.leave_balance ?? []).filter(
    (leave) => leave.dont_show_in_frontend !== 1
  );

  const visibleTypes = leaveBalance.map((l) => l.type);

  const transactions = (data?.leave_transactions ?? []).filter((t) =>
    visibleTypes.includes(t.type)
  );

  return (
    <div className="pb-4 relative">
      <LeaveTransactionsChart data={data?.leave_transactions} />

      {selectedLeave && (
        <BalanceDetailsDrawer
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          leaveType={selectedLeave.type}
          leaveData={selectedLeave}
        />
      )}

      {showTransactions ? (
        <div className="fixed inset-0 z-50 flex flex-col md:static md:max-w-full">
          <HeaderBar
            title="Transactions History"
            onBack={() => toggleTransactions(null)}
            bgColor=""
          />
          <main className="flex-1 overflow-y-auto p-4">
            <LeaveTransactionCard
              data={transactions}
              defaultOpenType={selectedType}
            />
          </main>
        </div>
      ) : (
        <>
          <div className="md:pt-4 md:p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-6 max-w-4xl mx-auto">
              {leaveBalance.map((leave) => (
                <div key={leave?.type}>
                  <Card shadow="sm" radius="xl" className="hover:shadow-md">
                    <div className="text-xl font-semibold mb-3 text-[#0094FF] flex justify-between items-center">
                      <Typography variant="subheading" color="title">
                        {leave?.type}
                      </Typography>
                      <div className="flex items-center gap-3">
                        {leave?.visibility_flags?.show_carry_over && (
                          <Typography color="success">
                            {leave.carry_over} Carry Forwarded
                          </Typography>
                        )}

                        {canRequestLeave && (
                          <button
                            onClick={() =>
                              openModal({
                                source: "balances",
                                leaveType: leave?.type,
                              })
                            }
                            className="rounded-full bg-primary/10 text-primary p-0.5"
                          >
                            <span>
                              <Plus size={20} />
                            </span>
                          </button>
                        )}

                        <DropdownMenu
                          placement="bottom-left"
                          className="text-gray-800 hover:primary-10"
                          items={[
                            {
                              label: "Details",
                              icon: <ListChecks size={16} />,
                              onClick: () => handleOpenDrawer(leave),
                            },
                          ]}
                        >
                          <EllipsisVertical
                            size={18}
                            className="text-primary"
                          />
                        </DropdownMenu>
                      </div>
                    </div>
                    <div
                      className="flex justify-between mt-2 gap-2 cursor-pointer"
                      onClick={() => toggleTransactions(leave.type)}
                    >
                      {leave?.visibility_flags?.show_entitled && (
                        <div className="flex-1 text-center  rounded-xl py-2 flex flex-col items-center justify-center bg-primary/10">
                          <FaRegCalendarCheck className="w-6 h-6 text-primary mb-1" />
                          <p className="md:text-lg text-base font-bold text-primary">
                            {leave.entitled}
                          </p>
                          <Typography color="primary" variant="bodyMedium">
                            Entitled
                          </Typography>
                        </div>
                      )}
                      {leave?.visibility_flags?.show_availed && (
                        <div className="flex-1 text-center  rounded-xl py-2 flex flex-col items-center justify-center bg-success/10">
                          <FaClockRotateLeft className="w-6 h-6 text-success mb-1" />
                          <p className="md:text-lg text-base font-bold text-success">
                            {leave.availed}
                          </p>
                          <Typography color="success" variant="bodyMedium">
                            Availed
                          </Typography>
                        </div>
                      )}
                      {leave?.visibility_flags?.show_balance && (
                        <div className="flex-1 text-center rounded-xl py-2 flex flex-col items-center justify-center bg-warning/20">
                          <FiPieChart className="w-6 h-6 text-orange-700 mb-1" />
                          <p className="md:text-lg text-base font-bold text-orange-700">
                            {leave.balance}
                          </p>
                          <Typography
                            variant="bodyMedium"
                            className="text-orange-700"
                          >
                            Balance
                          </Typography>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {canRequestLeave && (
            <div className="w-full mt-6 px-4 md:hidden">
              <button
                type="button"
                className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                onClick={() => openModal()}
              >
                + Request Leave
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LeaveBalance;
