"use client";
import type React from "react";

interface CurrentBalanceTabProps {
  leaveData: any;
}

const CurrentBalanceTab: React.FC<CurrentBalanceTabProps> = ({ leaveData }) => {
  const today = new Date().toISOString().split("T")[0];
  const formatDate = (date: string) => {
    const [year, month, day] = date.split("-");
    return `${day}-${month}-${year}`;
  };

  return (
    <div className="p-4">
      {/* Date Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Date
        </label>
        <div className="relative max-w-md">
          <input
            type="text"
            value={formatDate(today)}
            readOnly
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Balance Display */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">
            Balance as of {formatDate(today)}
          </h3>
          <span className="text-4xl font-bold text-gray-900">
            {leaveData?.balance ?? 0}
          </span>
        </div>
      </div>

      {/* Accrued So Far */}
      <div className="border-b border-gray-200 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium text-gray-900 mb-1">
              Accrued So Far This Year
            </h4>
            <p className="text-sm text-gray-600">
              Annual Allotment : {leaveData?.entitled ?? 0}
            </p>
          </div>
          <span className="text-xl font-bold text-green-600">
            +{leaveData?.entitled ?? 0}
          </span>
        </div>
      </div>

      {/* Credited From Last Year */}
      <div className="border-b border-gray-200 py-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Credited From Last Year</h4>
          <span className="text-xl font-bold text-gray-900">
            {leaveData?.carry_over ?? 0}
          </span>
        </div>
      </div>

      {/* More Details */}
      <div className="py-4">
        <button className="w-full flex items-center justify-between text-gray-900 font-medium">
          <span>More Details</span>
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 text-xs text-gray-500 italic">
        *There could be a mismatch in the totals on this page, as a few data
        points have been disabled due to admin configurations.
      </div>
    </div>
  );
};

export default CurrentBalanceTab;
