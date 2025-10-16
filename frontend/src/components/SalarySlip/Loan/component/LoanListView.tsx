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
        {/* CHANGED: Using .my-table-header and .my-table-header-text */}
        <div className="my-table-header grid grid-cols-11 sticky top-0 z-10">
          <div className="my-table-header-text flex items-center">
            <span className="px-2 rounded text-primary">
              <BsDashSquareFill />
            </span>
          </div>
          <div className="my-table-header-text">Loan Name</div>
          <div className="my-table-header-text">Loan Type</div>
          <div className="my-table-header-text">Loan Amount</div>
          <div className="my-table-header-text">Rate of Interest</div>
          <div className="my-table-header-text">Standard Interest</div>
          <div className="my-table-header-text">EMI Type</div>
          <div className="my-table-header-text">Installments</div>
          <div className="my-table-header-text">Start Date</div>
          <div className="my-table-header-text">End Month</div>
          <div className="my-table-header-text">Status</div>
        </div>

        <div className="text-sm bg-white divide-y divide-gray-200">
          {loans.map((loan) => (
            <div key={loan.loan_name} className="border-b border-gray-200">
              {/* CHANGED: Using .my-data-row and .my-data-cell */}
              <div className="my-data-row grid grid-cols-11">
                <div className="my-data-cell flex items-center">
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
                <div className="my-data-cell">{loan.loan_name}</div>
                <div className="my-data-cell">{loan.loan_type}</div>
                <div className="my-data-cell font-medium">
                  {loan.status === "Open"
                    ? loan.loan_requested_amount
                    : formatCurrency(loan.loan_approved_amount)}
                </div>
                <div className="my-data-cell">
                  {loan.rate_of_interest || "0"}%
                </div>
                <div className="my-data-cell">
                  {loan.standard_interest || "0"}%
                </div>
                <div className="my-data-cell">{loan.emi_type}</div>
                
                <div className="my-data-cell">{loan.loan_tenure || "0"}</div>
                <div className="my-data-cell">
                  {loan.loan_start_date || "-"}
                </div>
                <div className="my-data-cell">
                  {loan.loan_start_date && loan.loan_tenure
                    ? calculateEndMonth(loan.loan_start_date, loan.loan_tenure)
                    : "-"}
                </div>
                <div className="my-data-cell">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-medium ${
                      loan.status === "Open"
                        ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                        : "bg-green-100 text-green-800 border border-green-200"
                    }`}
                  >
                    {loan.status === "Open" ? "Pending" : loan.status}
                  </span>
                </div>
              </div>

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
        // CHANGED: Using new .my-empty-state-card class
        <div className="my-empty-state-card">
          <p className="text-gray-500">No loans available.</p>
        </div>
      )}
    </div>
  );
}
