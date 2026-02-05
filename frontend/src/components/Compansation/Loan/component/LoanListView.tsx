"use client";
import { useState } from "react";
import { IoIosArrowUp, IoIosArrowDown } from "react-icons/io";
import { Loan } from "../Type/loan";
import LoanDetails from "./LoanDetails";
import LoanInstallments from "./LoanInstallment";
import CardTable from "../../../shared/CardTable";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import { Typography } from "../../../shared/atoms/Typography";
import Tooltip from "../../../shared/Tooltip";
import StatusBadge from "../../../shared/atoms/statusBadge";

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
    "1fr",
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
      <div className="border bg-app divide-y">
        {loans.map((loan) => (
          <div
            key={loan.loan_name}
            onClick={() => toggleLoanExpansion(loan.loan_name)}
            className="hover:bg-primary/10  cursor-pointer"
          >
            {/* Row */}
            <div
              className="grid items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
              style={{
                gridTemplateColumns: columnWidths.join(" "),
                alignItems: "center",
              }}
            >
              {/* Expand Button */}
              <div className="flex items-center justify-center">
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
              <Typography
                variant="bodySmall"
                className="font-medium text-center"
              >
                {loan.loan_name}
              </Typography>

              {/* Loan Type */}
              <Typography
                variant="bodySmall"
                className="font-medium text-center"
              >
                {loan.loan_type}
              </Typography>

              {/* Loan Amount */}
              <Typography
                variant="bodySmall"
                className="font-medium text-center"
              >
                {loan.status === "Open"
                  ? loan.loan_requested_amount
                  : formatCurrency(loan.loan_approved_amount)}
              </Typography>

              {/* Rate of Interest */}
              <Typography
                variant="bodySmall"
                className="font-medium text-center"
              >
                {loan.rate_of_interest || "0"}%
              </Typography>

              {/* Standard Interest */}
              <Typography
                variant="bodySmall"
                className="font-medium text-center"
              >
                {loan.standard_interest || "0"}%
              </Typography>

              {/* EMI Type */}
              <Typography
                variant="bodySmall"
                className="font-medium text-center"
              >
                {loan.emi_type}{" "}
              </Typography>

              {/* Installments */}
              <Typography
                variant="bodySmall"
                className="font-medium text-center"
              >
                {loan.loan_tenure || "0"}
              </Typography>

              {/* Start Date */}
              <Typography
                variant="bodySmall"
                className="font-medium text-center"
              >
                {formatToIndianDate(loan.loan_start_date)}
              </Typography>

              {/* End Month */}
              <Typography
                variant="bodySmall"
                className="font-medium text-center"
              >
                {loan.loan_start_date && loan.loan_tenure
                  ? calculateEndMonth(loan.loan_start_date, loan.loan_tenure)
                  : "-"}
              </Typography>

              {/* Status + Tooltip */}
              <div className="flex items-center justify-center">
                <Tooltip content={`Allocated to : ${loan?.employee_name}`}>
                  <StatusBadge status={loan.status} />
                </Tooltip>
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
