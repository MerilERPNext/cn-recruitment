/* eslint-disable @typescript-eslint/no-explicit-any */
import { useNavigate, useParams } from "react-router";
import HeaderBar from "../../../HeaderBar";
import { useCurrentEmployeeAllDetails } from "../../../../hooks/useEmployee";
import { useLoan } from "../../../../hooks/useLoan";
import { useLoggedInUser } from "../../../../hooks/useLoggedInUser";
import { useEffect, useState } from "react";
import { formatCurrency } from "../../../../utils/currencyFormatter";
import StatusBadge from "../../../shared/atoms/statusBadge";

export default function LoanSummary() {
  const { data: userId } = useLoggedInUser();
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const { loanId } = useParams();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");
  const employeeId = user?.employee ?? "";
  const { data: loanData } = useLoan(employeeId || "");
  const navigate = useNavigate();

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
      (item: any, index: number) => [
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

  if (!selectedLoan) {
    return (
      <div className="text-center text-gray-600">
        <HeaderBar title="Loan Details" onBack={() => navigate(-1)} />
        <p>No loan found for this ID.</p>
      </div>
    );
  }

  return (
    <div>
      <HeaderBar title="Loan Details" onBack={() => navigate(-1)} />
      <div className="max-w-md mx-auto bg-gray-50 p-6 font-sans">
        {/* Loan Summary */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow">
          <h1 className="text-lg font-semibold text-gray-900 mb-6">
            Loan Summary
          </h1>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Loan Name</p>
              <p className="text-xs font-semibold text-gray-900">
                {selectedLoan.loan_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Loan Type</p>
              <p className="text-xs font-semibold text-gray-900">
                {selectedLoan.loan_type}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Loan Amount</p>
              <p className="text-xs font-semibold text-gray-900">
                {selectedLoan.status === "Open"
                  ? formatCurrency(selectedLoan.loan_requested_amount)
                  : formatCurrency(selectedLoan.loan_approved_amount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Status</p>

              <StatusBadge status={selectedLoan.status} />
            </div>
          </div>
        </div>

        {/* Installment Breakup */}
        <div className="mb-8 bg-white py-6 px-2 rounded-lg shadow">
          <h2 className="text-lg ml-4 font-semibold text-gray-900 mb-6">
            Installment Breakup
          </h2>

          <div className="bg-gray-100 px-4 py-3 grid grid-cols-5 gap-4 text-[9px] font-medium text-gray-700 uppercase tracking-wider">
            <div>#</div>
            <div>Payment Date</div>
            <div>Principal</div>
            <div>Interest</div>
            <div>Balance</div>
          </div>

          <div className="divide-y divide-gray-200">
            {selectedLoan.repayment_schedule?.map(
              (item: any, index: number) => (
                <div
                  key={index}
                  className={`px-4 py-4 grid grid-cols-5 gap-4 text-[9px] ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <div className="text-gray-900 font-medium max-w-4">
                    {index + 1}
                  </div>
                  <div className="text-gray-600">{item.payment_date}</div>
                  <div className="text-gray-900">
                    {formatCurrency(item.principal_amount)}
                  </div>
                  <div className="text-gray-900">
                    {formatCurrency(item.interest_amount)}
                  </div>
                  <div className="text-gray-900">
                    {formatCurrency(item.balance_loan_amount)}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>

        {/* Download Button */}
        <button
          onClick={downloadCSV}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          Download Loan Statement
        </button>
      </div>
    </div>
  );
}
