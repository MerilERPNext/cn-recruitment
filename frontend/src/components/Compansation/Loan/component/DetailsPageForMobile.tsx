/* eslint-disable @typescript-eslint/no-explicit-any */
import { Download, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useTargetUser } from "../../../../context/ViewedUserContext";
import { useCurrentEmployeeDetails } from "../../../../hooks/useEmployee";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import FrappeAPI from "../../../../utils/frappeAPI";
import Button from "../../../shared/atoms/Button";
import { Typography } from "../../../shared/atoms/Typography";
import LoanDetails from "./LoanDetails";
import LoanInstallmentsMobileCards from "./LoanInstallmentsMobileCards";

interface RepaymentItem {
  payment_date: string;
  principal_amount: number;
  interest_amount: number;
  balance_loan_amount: number;
  total_payment: number;
}

export default function LoanSummary() {
  const { loanId } = useParams();
  const { data: user, isFetching: userLoading } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const { targetEmployeeId } = useTargetUser();
  const employeeId = targetEmployeeId || user?.employee || "";

  // Fetch with a large page_length so loans beyond the default first page are also available
  const { data: loanData, isLoading: loanLoading } = useQuery({
    queryKey: ["loan-detail", employeeId, loanId],
    queryFn: () =>
      FrappeAPI.callMethod(
        "cn_indian_payroll.cn_indian_payroll.overrides.loan_dashboard.print_loan_dashboard",
        { employee: employeeId, page_length: 500 },
      ),
    enabled: !!employeeId,
  });
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();

  // Desktop users use the inline row-expand on the list page instead.
  useEffect(() => {
    if (isDesktop) {
      navigate("/webapp/salary-slip-app/my-loan-requests", { replace: true });
    }
  }, [isDesktop, navigate]);

  // The dashboard endpoint returns either an array or a { data: [...] } object.
  const selectedLoan = useMemo(() => {
    const loans: any[] = Array.isArray(loanData)
      ? loanData
      : (loanData as any)?.data ?? [];
    if (!loanId) return null;
    return (
      loans.find(
        (loan: any) =>
          loan?.loan_name === loanId || loan?.name === loanId,
      ) ?? null
    );
  }, [loanData, loanId]);

  const isLoading = userLoading || loanLoading || !loanData;

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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
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

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : !selectedLoan ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <Typography variant="mobileCardValue" className="text-gray-500">
            No loan found for this ID.
          </Typography>
        </div>
      ) : (
        <>
          {/* Content: Only Loan Details and Loan Breakdown Details as requested */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-app">
            {/* 1. Loans Details Component */}
            <LoanDetails
              loan={selectedLoan}
              className="!w-full !max-w-none !mb-0"
            />

            {/* 2. Loans Breakup Details (Responsive 1-col / 2-col Mobile Cards) */}
            <LoanInstallmentsMobileCards
              installments={selectedLoan.repayment_schedule || []}
              standardInterest={selectedLoan.standard_interest}
              docId={selectedLoan.name || selectedLoan.loan_name}
            />
          </div>

          {/* Download Button — sticky at bottom */}
          <div className="border-t bg-white px-4 py-3">
            <Button size="lg" fullWidth bgColor="primary" onClick={downloadCSV}>
              <Download className="h-4 w-4" />
              Download Loan Statement
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
