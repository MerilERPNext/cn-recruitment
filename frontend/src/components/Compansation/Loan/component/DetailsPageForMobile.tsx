/* eslint-disable @typescript-eslint/no-explicit-any */
import { Download, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useTargetUser } from "../../../../context/ViewedUserContext";
import { useCurrentEmployeeDetails } from "../../../../hooks/useEmployee";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import FrappeAPI from "../../../../utils/frappeAPI";
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
  total_payment: number;
}

export default function LoanSummary() {
  const { loanId } = useParams();
  const { data: user, isFetching: userLoading } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const { targetEmployeeId } = useTargetUser();
  const employeeId = targetEmployeeId || user?.employee || "";
  // Fetch with a large page_length so loans beyond the default first page are
  // also available (the list can have more entries than one page).
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
    return loans.find((loan: any) => loan?.loan_name === loanId) ?? null;
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

            {/* Installment Breakup — table like the desktop installments listview */}
            <div className="mt-4">
              <Typography
                variant="bodySmall"
                className="base-title mb-2 font-bold block"
              >
                Installment Breakup
              </Typography>

              {selectedLoan.repayment_schedule?.length > 0 ? (
                <div className="overflow-x-auto border border-gray-100 rounded-lg">
                  <table className="min-w-[640px] w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-3 py-2 text-center font-bold whitespace-nowrap w-12">
                          #
                        </th>
                        <th className="px-3 py-2 text-center font-bold whitespace-nowrap">
                          Payment Date
                        </th>
                        <th className="px-3 py-2 text-center font-bold whitespace-nowrap">
                          Loan Amount
                        </th>
                        <th className="px-3 py-2 text-center font-bold whitespace-nowrap">
                          EMI Amount
                        </th>
                        <th className="px-3 py-2 text-center font-bold whitespace-nowrap">
                          Interest
                        </th>
                        <th className="px-3 py-2 text-center font-bold whitespace-nowrap">
                          Principal
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedLoan.repayment_schedule.map(
                        (item: RepaymentItem, index: number) => (
                          <tr
                            key={index}
                            className="border-b border-gray-100 hover:bg-primary/10"
                          >
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              {index + 1}
                            </td>
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              {formatToIndianDate(item.payment_date)}
                            </td>
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              {formatCurrency(
                                item.balance_loan_amount + item.principal_amount,
                              )}
                            </td>
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              {formatCurrency(item.total_payment)}
                            </td>
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              {formatCurrency(item.interest_amount)}
                            </td>
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              {formatCurrency(item.principal_amount)}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-6 text-center border border-gray-200 rounded-lg bg-gray-50 mt-2">
                  <Typography variant="mobileCardValue" className="text-gray-500">
                    No installment available.
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
        </>
      )}
    </div>
  );
}
