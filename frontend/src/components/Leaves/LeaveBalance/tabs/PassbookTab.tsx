"use client";
import type React from "react";
import { useState } from "react";
import { Settings } from "lucide-react";

interface PassbookTransaction {
  time: string;
  comment: string;
  opening_balance: number;
  transacted_balance: number;
  closing_balance?: number;
}

interface PassbookTabProps {
  leaveData: any;
}

const PassbookTab: React.FC<PassbookTabProps> = ({ leaveData }) => {
  const [selectedCycle, setSelectedCycle] = useState("2025-April");

  // This should come from API - using mock data for now
  const passbookTransactions: PassbookTransaction[] = [
    {
      time: "23-07-2025 17:08:22",
      comment:
        "The Leave balance was updated due to the credit of a new accrual balance or a change in the accrual configuration",
      opening_balance: 0,
      transacted_balance: 8,
      closing_balance: 8,
    },
    {
      time: "01-08-2025 12:21:51",
      comment:
        "The Leave balance was updated due to the credit of a new accrual balance or a change in the accrual configuration",
      opening_balance: 8,
      transacted_balance: 2,
      closing_balance: 10,
    },
    {
      time: "01-09-2025 11:42:43",
      comment:
        "The Leave balance was updated due to the credit of a new accrual balance or a change in the accrual configuration",
      opening_balance: 10,
      transacted_balance: 2,
      closing_balance: 12,
    },
    {
      time: "03-10-2025 14:15:01",
      comment:
        "The Leave balance was updated due to the credit of a new accrual balance or a change in the accrual configuration",
      opening_balance: 12,
      transacted_balance: 2,
      closing_balance: 14,
    },
    {
      time: "03-11-2025 11:59:09",
      comment:
        "The Leave balance was updated due to the credit of a new accrual balance or a change in the accrual configuration",
      opening_balance: 14,
      transacted_balance: 2,
      closing_balance: 16,
    },
    {
      time: "08-12-2025 11:07:56",
      comment:
        "The Leave balance was updated due to the credit of a new accrual balance or a change in the accrual configuration",
      opening_balance: 16,
      transacted_balance: 2,
      closing_balance: 18,
    },
  ];

  const formatDateTime = (dateTime: string) => {
    const [date, time] = dateTime.split(" ");
    return (
      <div className="flex flex-col">
        <span className="font-medium">{date}</span>
        <span className="text-xs text-gray-500">{time}</span>
      </div>
    );
  };

  return (
    <div className="p-4">
      {/* Transaction Period and Cycle */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-1">
            Transaction
          </h3>
          <p className="text-base font-semibold">
            From: 01-04-2025 To: 31-03-2026
          </p>
        </div>
        <div className="min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cycle Starts
          </label>
          <select
            value={selectedCycle}
            onChange={(e) => setSelectedCycle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
          >
            <option value="2025-April">2025-April</option>
            <option value="2024-April">2024-April</option>
            <option value="2023-April">2023-April</option>
          </select>
        </div>
      </div>

      {/* Settings Icon */}
      <div className="flex justify-end mb-4">
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <Settings size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Passbook Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Time
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Comment
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">
                Opening Balance
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">
                Transacted Balance
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">
                Closing Balance
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {passbookTransactions.length > 0 ? (
              passbookTransactions.map((transaction, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDateTime(transaction.time)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700 max-w-md">
                      {transaction.comment}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center font-medium">
                    {transaction.opening_balance}
                  </td>
                  <td className="px-4 py-3 text-center font-medium">
                    {transaction.transacted_balance}
                  </td>
                  <td className="px-4 py-3 text-center font-medium">
                    {transaction.closing_balance ?? "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No transactions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Passbook Note */}
      <div className="mt-4 text-xs text-gray-500 italic">
        *Leave Passbook for this policy only contains records from 23-07-2025
      </div>
    </div>
  );
};

export default PassbookTab;
