"use client";
import { useState } from "react";
import { IoIosArrowUp, IoIosArrowDown } from "react-icons/io";
import { BsDashSquareFill } from "react-icons/bs";
import { Loan } from "../Type/loan";
import LoanDetails from "./LoanDetails";
import LoanInstallments from "./LoanInstallment";

interface LoanListProps {
  loans: Loan[];
}

export default function LoanList({ loans }: LoanListProps) {
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);

  const toggleLoanExpansion = (loan_name: string) => {
    setExpandedLoan(expandedLoan === loan_name ? null : loan_name);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  function calculateEndMonth(startDate: string, tenure: number) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + tenure);
    return d.toISOString().slice(0, 7); // YYYY-MM
  }

  return (
    <div className="w-full">
      <div className="w-full max-h-full overflow-auto border border-gray-200 rounded-lg shadow-sm">
        {/* Header */}
        <div className="grid grid-cols-11 bg-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center">
            <span className="px-2 rounded text-blue-500">
              <BsDashSquareFill />
            </span>
          </div>
          <div className="px-4 py-3">Loan Type</div>
          <div className="px-4 py-3">EMI Type</div>
          <div className="px-4 py-3">Loan Amount</div>
          <div className="px-4 py-3">Rate of Interest</div>
          <div className="px-4 py-3">Standard Interest</div>
          <div className="px-4 py-3">Installments</div>
          <div className="px-4 py-3">Start Date</div>
          <div className="px-4 py-3">End Month</div>
          <div className="px-4 py-3">Status</div>
          <div className="px-4 py-3">Action</div>
        </div>

        {/* Rows */}
        <div className="text-sm bg-white divide-y divide-gray-200">
          {loans.map((loan) => (
            <div key={loan.loan_name} className="border-b border-gray-200">
              {/* Row */}
              <div className="grid grid-cols-11 hover:bg-gray-50 transition-colors">
                <div className="px-4 py-3 flex items-center">
                  <button
                    onClick={() => toggleLoanExpansion(loan.loan_name)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors text-gray-600 font-mono"
                  >
                    {expandedLoan === loan.loan_name ? (
                      <IoIosArrowUp />
                    ) : (
                      <IoIosArrowDown />
                    )}
                  </button>
                </div>
                <div className="px-4 py-3 text-gray-700">{loan.loan_type}</div>
                <div className="px-4 py-3 text-gray-700">{loan.emi_type}</div>
                <div className="px-4 py-3 font-medium text-gray-900">
                  {formatCurrency(loan.loan_approved_amount)}
                </div>
                <div className="px-4 py-3 text-gray-700">
                  {loan.rate_of_interest}%
                </div>
                <div className="px-4 py-3 text-gray-700">
                  {loan.standard_interest}%
                </div>
                <div className="px-4 py-3 text-gray-700">
                  {loan.loan_tenure}
                </div>
                <div className="px-4 py-3 text-gray-700">
                  {loan.loan_start_date}
                </div>
                <div className="px-4 py-3 text-gray-700">
                  {loan.loan_start_date && loan.loan_tenure
                    ? calculateEndMonth(loan.loan_start_date, loan.loan_tenure)
                    : "-"}
                </div>
                <div className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-medium ${
                      loan.status === "Open"
                        ? "bg-green-100 text-green-800 border border-green-200"
                        : "bg-gray-100 text-gray-800 border border-gray-200"
                    }`}
                  >
                    {loan.status || "Open"}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <button className="px-1  text-[11px] text-blue-600 bg-blue-200 border-blue-600 rounded hover:bg-blue-50 bg-transparent transition-colors font-medium">
                    Complete
                  </button>
                </div>
              </div>

              {/* Expanded Row */}
              {expandedLoan === loan.loan_name && (
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                  <div className="space-y-4">
                    <LoanDetails loan={loan} />
                    <LoanInstallments installments={loan.repayment_schedule} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {loans.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <p className="text-gray-500">No loans available.</p>
        </div>
      )}
    </div>
  );
}
