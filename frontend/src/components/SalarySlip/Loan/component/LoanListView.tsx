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
        <table className="w-full divide-y divide-gray-200 ">
          <thead className="bg-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left">
                <span className="px-2 rounded text-blue-500">
                  <BsDashSquareFill />
                </span>
              </th>
              <th className="px-4 py-3 text-left">Loan Type</th>
              <th className="px-4 py-3 text-left">EMI Type</th>
              <th className="px-4 py-3 text-left">Loan Amount</th>
              <th className="px-4 py-3 text-left">Rate of Interest</th>
              <th className="px-4 py-3 text-left">Standard Interest</th>
              <th className="px-4 py-3 text-left">Installments</th>
              <th className="px-4 py-3 text-left">Start Date</th>
              <th className="px-4 py-3 text-left">End Month</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-200 bg-white">
            {loans.map((loan) => (
              <>
                <tr
                  key={loan.loan_name}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
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
                  </td>
                  <td className="px-4 py-3 text-gray-700">{loan.loan_type}</td>
                  <td className="px-4 py-3 text-gray-700">{loan.emi_type}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {formatCurrency(loan.loan_approved_amount)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {loan.rate_of_interest}%
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {loan.standard_interest}%
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {loan.loan_tenure}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {loan.loan_start_date}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {loan.loan_start_date && loan.loan_tenure
                      ? calculateEndMonth(
                          loan.loan_start_date,
                          loan.loan_tenure
                        )
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-medium ${
                        loan.status === "Open"
                          ? "bg-green-100 text-green-800 border border-green-200"
                          : "bg-gray-100 text-gray-800 border border-gray-200"
                      }`}
                    >
                      {loan.status || "Open"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="px-3 py-1.5 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-50 bg-transparent transition-colors font-medium">
                      Complete
                    </button>
                  </td>
                </tr>
                {expandedLoan === loan.loan_name && (
                  <tr className="bg-gray-50">
                    <td
                      colSpan={13}
                      className="px-6 py-4 border-t border-gray-200"
                    >
                      <div className="space-y-4">
                        <LoanDetails loan={loan} />
                        <LoanInstallments
                          installments={loan.repayment_schedule}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {loans.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <p className="text-gray-500">No loans available.</p>
        </div>
      )}
    </div>
  );
}
