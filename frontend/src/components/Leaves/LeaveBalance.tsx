import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const leaveData = [
  {
    type: "Casual Leave",
    entitled: 10,
    availed: 5,
    balance: 5,
  },
  {
    type: "Sick Leave",
    entitled: 10,
    availed: 2,
    balance: 8,
  },
  {
    type: "Vacation Leave",
    entitled: 20,
    availed: 10,
    balance: 10,
  },
];

const transactionData = [
  {
    type: "Wedding Leave",
    total: 0,
    monthly: Array(12).fill(0),
  },
  {
    type: "EL - One 15",
    total: 0,
    monthly: Array(12).fill(0),
  },
  {
    type: "Loss of Pay",
    total: 9,
    monthly: [0, 0, 0, 0, 4, 0, 5, 0, 0, 0, 0, 0],
  },
  {
    type: "Sick leave",
    total: 0,
    monthly: Array(12).fill(0),
  },
  {
    type: "Unpaid",
    total: 34,
    monthly: Array(12).fill(0),
  },
  {
    type: "Unpaid",
    total: 34,
    monthly: Array(12).fill(0),
  },
  {
    type: "Unpaid",
    total: 34,
    monthly: Array(12).fill(0),
  },
  {
    type: "Unpaid",
    total: 34,
    monthly: Array(12).fill(0),
  },
  {
    type: "Unpaid",
    total: 34,
    monthly: Array(12).fill(0),
  },
  {
    type: "Unpaid",
    total: 34,
    monthly: Array(12).fill(0),
  },
];

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const LeaveTransactionCard = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className=" max-w-md mx-auto pb-8">
      {transactionData.map((leave, index) => (
        <div key={index} className="border border-gray-200 rounded-lg mb-2 shadow-md">
          <button
            className="w-full flex justify-between items-center p-4 bg-white rounded-lg"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
          >
            <span className="font-medium">{leave.type}</span>
            <span className="text-lg font-bold text-gray-700">{leave.total.toString().padStart(2, "0")}</span>
          </button>
          {openIndex === index && (
            <div className="grid grid-cols-4 gap-2 p-4 bg-gray-50">
              {leave.monthly.map((count, i) => (
                <div
                  key={i}
                  className="text-sm text-center p-2 border rounded-lg bg-white shadow-sm"
                >
                  <div className="font-medium">{monthLabels[i]}</div>
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
const activeBg = "bg-[#EAF6FF]";
const inactiveBg = "bg-[#FFF]";

const LeaveBalance: React.FC = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [showTransactions, setShowTransactions] = useState(false);
  const navigate = useNavigate();

  const handleViewTransactions = () => {
    navigate('/webapp/leave-app/leaves/transactions');
  };

  return (
    <div className="min-h-screen px-4 pb-4 bg-[#F8FBFC] relative">
      <div className="pt-4">
        {leaveData.map((leave, idx) => (
          <div
            key={leave.type}
            className={`rounded-xl mb-4 p-4 shadow-sm cursor-pointer transition-colors ${idx === activeIdx ? activeBg : inactiveBg
              }`}
            onClick={() => setActiveIdx(idx)}
          >
            <div className={`text-xl font-semibold mb-3 ${labelColor}`}>
              {leave.type}
            </div>
            <div className="flex justify-between">
              <div className="flex-1 text-center">
                <div className="text-xl font-bold">{leave.entitled}</div>
                <div className="text-[#7A7A7A] text-sm mt-1">Entitled</div>
              </div>
              <div className="flex-1 text-center border-x">
                <div className="text-xl font-bold">{leave.availed}</div>
                <div className="text-[#7A7A7A] text-sm mt-1">Availed</div>
              </div>
              <div className="flex-1 text-center">
                <div className="text-xl font-bold">{leave.balance}</div>
                <div className="text-[#7A7A7A] text-sm mt-1">Balance</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="w-full mt-6">
        <button
          className="bg-black rounded-lg text-white w-full py-2"
          onClick={() => setShowTransactions(true)}
        >
          Leave Transactions
        </button>
      </div>

      {/* Transactions Modal */}
      {showTransactions && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          {/* Header */}
          <div className="bg-white p-4 border-b flex justify-between items-center sticky top-0 z-10">
            <h2 className="text-xl font-semibold">Transactions History</h2>
            <button
              onClick={() => setShowTransactions(false)}
              className="text-gray-500 hover:text-gray-700 p-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <LeaveTransactionCard />
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveBalance;
