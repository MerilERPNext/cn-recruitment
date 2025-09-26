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
          className="border border-gray-200 rounded-lg mb-2 shadow-md"
        >
          <button
            type="button"
            aria-expanded={openIndex === idx}
            className="w-full flex justify-between items-center p-4 bg-white rounded-lg"
            onClick={() => toggle(idx)}
          >
            <span className="font-medium">{entry.type}</span>
            <span className="text-lg font-bold text-gray-700">
              {entry.total.toString().padStart(2, "0")}
            </span>
          </button>

          {openIndex === idx && (
            <div className="grid grid-cols-4 gap-2 p-4 bg-gray-50">
              {entry.monthly.map((count, mIdx) => (
                <div
                  key={`${entry.type}-${mIdx}`}
                  className="text-sm text-center p-2 border rounded-lg bg-white shadow-sm"
                >
                  <div className="font-medium">{monthLabels[mIdx]}</div>
                  <div className="text-blue-600 font-bold">{count}</div>
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
  const { openModal } = useRequestLeaveModal();
  const { data: userId, isLoading: isUserLoading } = useLoggedInUser();
  const { data: currentEmployee, isLoading: isEmployeeLoading } =
    useEmployeeByUserId(userId);
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
      {showTransactions ? (
        <div className="fixed inset-0 bg-white z-50 flex flex-col md:static md:max-w-full">
          <HeaderBar
            title="Transactions History"
            onBack={() => toggleTransactions(null)}
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
                <div
                  key={leave.type}
                  className="rounded-xl p-4 mb-4 md:mb-0 bg-white"
                >
                  <div className="text-xl font-semibold mb-3 text-[#0094FF] flex justify-between items-center">
                    <span className="text-left text-black">{leave.type}</span>
                    {leave.visibility_flags.show_entitled && (
                      <span className="text-sm text-green-800">
                        {leave.carry_over} Carry Forwarded
                      </span>
                    )}
                  </div>
                  <div
                    className="flex justify-between mt-2 gap-2 cursor-pointer"
                    onClick={() => toggleTransactions(leave.type)}
                  >
                    {leave.visibility_flags.show_entitled && (
                      <div className="flex-1 text-center border border-blue-100 rounded-lg py-2 flex flex-col items-center justify-center bg-blue-50">
                        <FaRegCalendarCheck className="w-6 h-6 text-blue-600 mb-1" />
                        <p className="text-lg font-bold text-blue-800">
                          {leave.entitled}
                        </p>
                        <p className="text-xs font-medium text-blue-700">
                          Entitled
                        </p>
                      </div>
                    )}
                    {leave.visibility_flags.show_availed && (
                      <div className="flex-1 text-center border border-green-100 rounded-lg py-2 flex flex-col items-center justify-center bg-green-50">
                        <FaClockRotateLeft className="w-6 h-6 text-green-600 mb-1" />
                        <p className="text-lg font-bold text-green-800">
                          {leave.availed}
                        </p>
                        <p className="text-xs font-medium text-green-700">
                          Availed
                        </p>
                      </div>
                    )}
                    {leave.visibility_flags.show_balance && (
                      <div className="flex-1 text-center border border-orange-100 rounded-lg py-2 flex flex-col items-center justify-center bg-orange-50">
                        <FiPieChart className="w-6 h-6 text-orange-600 mb-1" />
                        <p className="text-lg font-bold text-orange-800">
                          {leave.balance}
                        </p>
                        <p className="text-xs font-medium text-orange-700">
                          Balance
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full mt-6 px-4 md:hidden">
            <button
              type="button"
              className="w-full py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
              onClick={() => openModal()}
            >
              + Request Leave
            </button>
          </div>
        </>
      )}
    </div>
  );
};
export default LeaveBalance;
