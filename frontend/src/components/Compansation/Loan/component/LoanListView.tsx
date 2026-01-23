"use client";
import { useState } from "react";
import { IoIosArrowUp, IoIosArrowDown } from "react-icons/io";
import { Loan } from "../Type/loan";
import LoanDetails from "./LoanDetails";
import LoanInstallments from "./LoanInstallment";
import CardTable from "../../../shared/CardTable";
import formatToIndianDate from "../../../../utils/formatToIndianDate";

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
    if (!startDate || !tenure) return "-";

    const date = new Date(startDate);
    date.setMonth(date.getMonth() + tenure);

    // Example: Format to MM/YYYY
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${year}`;
  }

  const titles = [
    "",
    "Loan Name",
    "Loan Type",
    "Loan Amount",
    "Rate of Interest",
    "Standard Interest",
    "EMI Type",
    "Installments",
    "Start Date",
    "End Month",
    "Status",
  ];

  const columnWidths = [
    "3rem",
    "1.5fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
  ];

  return (
    <CardTable titles={titles} columnWidths={columnWidths}>
      <div className="border  bg-app divide-y">
        {loans.map((loan) => (
          <div
            key={loan.loan_name}
            onClick={() => toggleLoanExpansion(loan.loan_name)}
            className="hover:bg-primary/10  cursor-pointer"
          >
            {/* Row */}
            <div
              className=" grid gap-4 px-6 py-3"
              style={{
                gridTemplateColumns: columnWidths.join(" "),
                alignItems: "center",
              }}
            >
              {/* Expand Button */}
              <div className="my-data-cell flex items-start">
                <button
                  onClick={() => toggleLoanExpansion(loan.loan_name)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-primary/10 rounded transition-colors text-gray-600"
                >
                  {expandedLoan === loan.loan_name ? (
                    <IoIosArrowUp />
                  ) : (
                    <IoIosArrowDown />
                  )}
                </button>
              </div>

              {/* Loan Name */}
              <div className="">{loan.loan_name}</div>

              {/* Loan Type */}
              <div className="">{loan.loan_type}</div>

              {/* Loan Amount */}
              <div className=" font-medium">
                {loan.status === "Open"
                  ? loan.loan_requested_amount
                  : formatCurrency(loan.loan_approved_amount)}
              </div>

              {/* Rate of Interest */}
              <div className="">{loan.rate_of_interest || "0"}%</div>

              {/* Standard Interest */}
              <div className="">{loan.standard_interest || "0"}%</div>

              {/* EMI Type */}
              <div>{loan.emi_type}</div>

              {/* Installments */}
              <div className="">{loan.loan_tenure || "0"}</div>

              {/* Start Date */}
              <div className="">{formatToIndianDate(loan.loan_start_date)}</div>

              {/* End Month */}
              <div className="">
                {loan.loan_start_date && loan.loan_tenure
                  ? calculateEndMonth(loan.loan_start_date, loan.loan_tenure)
                  : "-"}
              </div>

              {/* Status + Tooltip */}
              <div className=" relative inline-block overflow-visible">
                <div className="group inline-block relative">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-medium cursor-pointer ${
                      loan.status === "Open"
                        ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                        : "bg-green-100 text-green-800 border border-green-200"
                    }`}
                  >
                    {loan.status === "Open" ? "Pending" : loan.status}
                  </span>

                  {/* Tooltip */}
                  <div
                    className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
                       opacity-0 invisible group-hover:opacity-100 group-hover:visible
                       transition-all duration-150 ease-out pointer-events-none
                       bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap
                       shadow-lg z-50"
                    role="tooltip"
                  >
                    {loan.employee_name}
                  </div>
                </div>
              </div>
            </div>
            {expandedLoan === loan.loan_name && (
              <div className="bg-app px-6 py-4 border-t border-gray-200">
                <div className="space-y-4">
                  <LoanDetails loan={loan} />
                  <LoanInstallments installments={loan.repayment_schedule} />
                </div>
              </div>
            )}
          </div>
        ))}
        {loans.length === 0 && (
          <div className="my-empty-state-card py-10 text-center text-gray-500">
            No loans available.
          </div>
        )}
      </div>
    </CardTable>
  );
}
