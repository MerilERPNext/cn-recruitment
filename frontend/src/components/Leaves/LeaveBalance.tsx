import React, { useState, useCallback } from "react";
import { useGetLeaveBalance } from "../../hooks/useLeaves";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { useEmployeeByUserId } from "../../hooks/useEmployee";
import { LeaveBalanceSkeleton } from "./LeaveSkeletons";
import { FaRegCalendarCheck } from "react-icons/fa";
import { TbBeach } from "react-icons/tb";
import { FaClockRotateLeft } from "react-icons/fa6";
import { AiOutlinePieChart } from "react-icons/ai";
import { FiPieChart } from "react-icons/fi";

type LeaveBalanceEntry = {
  type: string;
  entitled: number;
  availed: number;
  balance: number;
  carry_over: number;
};

type LeaveTransactionEntry = {
  type: string;
  total: number;
  monthly: number[];
};

type LeaveBalanceResponse = {
  leave_balance: LeaveBalanceEntry[];
  leave_transactions: LeaveTransactionEntry[];
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
}> = ({ data }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = useCallback(
    (index: number) => setOpenIndex((prev) => (prev === index ? null : index)),
    []
  );

  return (
    <div className="max-w-md mx-auto pb-8">
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

const labelColor = "text-[#0094FF]";
const inactiveBg = "bg-[#FFF]";

const LeaveBalance: React.FC = () => {
  const [showTransactions, setShowTransactions] = useState(false);

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

  const openTransactions = useCallback(() => setShowTransactions(true), []);
  const closeTransactions = useCallback(() => setShowTransactions(false), []);

  if (isUserLoading || isEmployeeLoading || isLeaveLoading) {
    return <LeaveBalanceSkeleton />;
  }
  if (isError || !data) {
    return (
      <div className="p-4 text-center text-red-600">
        Failed to load leave data
      </div>
    );
  }

  const leaveBalance = data?.leave_balance ?? [];
  const transactions = data?.leave_transactions ?? [];

  return (
    <div className=" pb-4 relative">
      <div className="pt-4">
        {leaveBalance.map((leave) => (
          <div key={leave.type} className={`rounded-xl p-4 ${inactiveBg}`}>
            <div
              className={`text-xl font-semibold mb-3 ${labelColor} flex justify-between items-center`}
            >
              <span>{leave.type}</span>

              <span className="text-sm text-green-800">
                {leave.carry_over > 0 ? "+" : ""}
                {leave.carry_over} Carry Forwarded
              </span>
            </div>

            <div className="flex justify-between mt-2 gap-2 ">
              <div className="flex-1 text-center border border-blue-100 rounded-lg py-2 flex flex-column items-center justify-center bg-blue-50">
                <FaRegCalendarCheck className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-blue-800">
                  {leave.entitled}
                </p>
                <p className="text-xs font-medium text-blue-700">Entitled</p>
              </div>
              <div className="flex-1 text-center border border-green-100 rounded-lg py-2 flex flex-column items-center justify-center bg-green-50">
                <FaClockRotateLeft className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-800">
                  {leave.availed}
                </p>
                <p className="text-xs font-medium text-green-700">Availed</p>
              </div>
              <div className="flex-1 text-center border border-orange-100 rounded-lg py- flex flex-column items-center justify-center bg-orange-50">
                <FiPieChart className="w-6 h-6 text-orange-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-orange-800">
                  {leave.balance}
                </p>
                <p className="text-xs font-medium text-orange-700">Balance</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="w-full mt-6 px-4">
        <button
          type="button"
          className="flex-1 w-full py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          onClick={openTransactions}
        >
          Leave Transactions
        </button>
      </div>
      {showTransactions && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          <header className="bg-white px-4 py-2 border-b flex justify-between items-center sticky top-0">
            <h2 className="text-xl font-semibold">Transactions History</h2>
            <button
              type="button"
              aria-label="Close transactions"
              className="text-gray-500 hover:text-gray-700 p-2"
              onClick={closeTransactions}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </header>

          <main className="flex-1 overflow-y-auto p-4">
            <LeaveTransactionCard data={transactions} />
          </main>
        </div>
      )}
    </div>
  );
};

export default LeaveBalance;
