"use client";
import type React from "react";
import { useState } from "react";
import { HelpCircle, Calendar } from "lucide-react";

interface AccrualJournalTabProps {
  leaveData: any;
}

const AccrualJournalTab: React.FC<AccrualJournalTabProps> = ({ leaveData }) => {
  const [selectedPeriod, setSelectedPeriod] = useState(
    "Month 9 (December-2025)"
  );

  // Generate month options - this should come from API
  const generateMonthOptions = () => {
    const months = [
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
      "January",
      "February",
      "March",
    ];
    const currentYear = 2025;

    return months.map((month, index) => {
      const monthNumber = index + 1;
      const year = index >= 9 ? currentYear + 1 : currentYear;
      return {
        value: `Month ${monthNumber} (${month}-${year})`,
        label: `Month ${monthNumber} (${month}-${year})`,
      };
    });
  };

  const monthOptions = generateMonthOptions();

  // Mock data - should come from API based on selected period
  const accrualData = {
    earnAmount: 2.0,
    frequency: "Beginning of Every month",
    formula: "Annual allotment / 12",
    netBalance: 2,
  };

  return (
    <div className="p-4 md:p-6">
      {/* Accrual Period Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Accrual Period
        </label>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {monthOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Accrual Policy Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            <HelpCircle className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">
              Accrual Policy
            </h3>
            <p className="text-sm text-gray-600">
              You earn{" "}
              <span className="font-semibold text-gray-900">
                {accrualData.earnAmount}
              </span>{" "}
              monthly at the {accrualData.frequency}
            </p>
          </div>
        </div>
      </div>

      {/* Standard Formula Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">
              Standard Formula
            </h3>
            <p className="text-sm text-gray-600">({accrualData.formula})</p>
          </div>
        </div>
      </div>

      {/* Net Balance Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">
            Net Balance Credited this Accrual Period
          </h3>
          <span className="text-2xl font-bold text-green-600">
            +{accrualData.netBalance}
          </span>
        </div>
      </div>

      {/* Optional: Additional Information */}
      <div className="mt-6 text-xs text-gray-500 italic">
        *Accrual calculations are based on the policy configuration and may vary
        based on your employment terms.
      </div>
    </div>
  );
};

export default AccrualJournalTab;
