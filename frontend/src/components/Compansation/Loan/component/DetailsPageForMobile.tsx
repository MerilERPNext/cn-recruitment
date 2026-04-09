/* eslint-disable @typescript-eslint/no-explicit-any */
import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useCurrentEmployeeAllDetails } from "../../../../hooks/useEmployee";
import { useLoan } from "../../../../hooks/useLoan";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import { formatCurrency } from "../../../../utils/currencyFormatter";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import Button from "../../../shared/atoms/Button";
import StatusBadge from "../../../shared/atoms/statusBadge";
import { Typography } from "../../../shared/atoms/Typography";

interface RepaymentItem {
  payment_date: string;
  principal_amount: number;
  interest_amount: number;
  balance_loan_amount: number;
}

export default function LoanSummary() {
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const { loanId } = useParams();
  const { data: user } = useCurrentEmployeeAllDetails(undefined, undefined, ["employee"]);
  const employeeId = user?.employee ?? "";
  const { data: loanData } = useLoan(employeeId || "");
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();

  useEffect(() => {
    if (isDesktop) {
      navigate("/webapp/salary-slip-app/my-loan-requests", { replace: true });
      return;
    }
  }, [isDesktop, navigate]);

  useEffect(() => {
    if (loanData && loanData?.length > 0 && loanId) {
      const foundLoan = loanData.find(
        (loan: any) => loan?.loan_name === loanId,
      );
      setSelectedLoan(foundLoan || null);
    }
  }, [loanData, loanId]);

  const downloadCSV = () => {
    if (!selectedLoan || !selectedLoan.repayment_schedule) return;

    const headers = [
      "S.No",
      "Payment Date",
      "Principal",
      "Interest",
      "Balance",
    ];
    const rows = selectedLoan.repayment_schedule.map(
      (item: RepaymentItem, index: number) => [
        index + 1,
        item.payment_date,
        item.principal_amount,
        item.interest_amount,
        item.balance_loan_amount,
      ],
    );

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedLoan.loan_name}_statement.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Desktop users are redirected above
  if (isDesktop) return null;

  if (!selectedLoan) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
        <div className="w-full h-full bg-white flex flex-col overflow-hidden relative">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
            <Typography
              variant="bodyMedium"
              className="font-semibold text-gray-900 leading-tight"
            >
              Loan Details
            </Typography>
            <Button
              variant="subtle"
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <Typography variant="mobileCardValue" className="text-gray-500">
              No loan found for this ID.
            </Typography>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="w-full h-full bg-white flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <Typography
            variant="bodyMedium"
            className="font-semibold text-gray-900 leading-tight"
          >
            Loan Details
          </Typography>
          <Button
            variant="subtle"
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Loan Name + Status */}
          <div className="flex gap-2 justify-between p-1">
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel">Loan Name</Typography>
              <Typography variant="mobileCardValue">
                {selectedLoan.loan_name}
              </Typography>
            </div>
            <div>
              <StatusBadge status={selectedLoan.status} />
            </div>
          </div>

          {/* Paired data rows */}
          <div className="flex flex-col items-start justify-between mt-2 rounded-md p-1 gap-4">
            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-2">
                <Typography variant="mobileCardLabel" className="block">
                  Loan Type
                </Typography>
                <Typography variant="mobileCardValue">
                  {selectedLoan.loan_type}
                </Typography>
              </div>
              <div className="flex flex-col gap-2 text-right">
                <Typography variant="mobileCardLabel" className="block">
                  Loan Amount
                </Typography>
                <Typography variant="mobileCardValue">
                  {selectedLoan.status === "Open"
                    ? formatCurrency(selectedLoan.loan_requested_amount)
                    : formatCurrency(selectedLoan.loan_approved_amount)}
                </Typography>
              </div>
            </div>

            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-2">
                <Typography variant="mobileCardLabel" className="block">
                  Interest Rate
                </Typography>
                <Typography variant="mobileCardValue">
                  {selectedLoan.rate_of_interest
                    ? `${selectedLoan.rate_of_interest}%`
                    : "—"}
                </Typography>
              </div>
              <div className="flex flex-col gap-2 text-right">
                <Typography variant="mobileCardLabel" className="block">
                  Start Date
                </Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate(selectedLoan.loan_start_date) || "—"}
                </Typography>
              </div>
            </div>
          </div>

          {/* Installment Breakup — card-style like Expense Claim Items */}
          <div className="mt-4">
            <Typography
              variant="bodySmall"
              className="base-title mb-2 font-bold block"
            >
              Installment Breakup
            </Typography>

            {selectedLoan.repayment_schedule?.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {selectedLoan.repayment_schedule.map(
                  (item: RepaymentItem, index: number) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
                    >
                      <div className="mb-3">
                        <Typography variant="label" className="card-title">
                          Installment {index + 1}
                        </Typography>
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        <div className="flex flex-col gap-1">
                          <Typography
                            variant="mobileCardLabel"
                            className="block"
                          >
                            Payment Date
                          </Typography>
                          <Typography variant="mobileCardValue">
                            {formatToIndianDate(item.payment_date)}
                          </Typography>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Typography
                            variant="mobileCardLabel"
                            className="block"
                          >
                            Principal
                          </Typography>
                          <Typography variant="mobileCardValue">
                            {formatCurrency(item.principal_amount)}
                          </Typography>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Typography
                            variant="mobileCardLabel"
                            className="block"
                          >
                            Interest
                          </Typography>
                          <Typography variant="mobileCardValue">
                            {formatCurrency(item.interest_amount)}
                          </Typography>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Typography
                            variant="mobileCardLabel"
                            className="block"
                          >
                            Balance
                          </Typography>
                          <Typography variant="mobileCardValue">
                            {formatCurrency(item.balance_loan_amount)}
                          </Typography>
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="py-6 text-center border border-gray-200 rounded-lg bg-gray-50 mt-2">
                <Typography variant="mobileCardValue" className="text-gray-500">
                  No installment data available.
                </Typography>
              </div>
            )}
          </div>
        </div>

        {/* Download Button — sticky at bottom */}
        <div className="border-t bg-white px-4 py-3">
          <Button size="lg" fullWidth bgColor="primary" onClick={downloadCSV}>
            <Download className="h-4 w-4" />
            Download Loan Statement
          </Button>
        </div>
      </div>
    </div>
  );
}
