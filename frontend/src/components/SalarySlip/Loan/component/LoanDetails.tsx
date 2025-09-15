import { Loan } from "../Type/loan"


interface LoanDetailsProps {
  loan: Loan
}

export default function LoanDetails({ loan }: LoanDetailsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="mb-6 p-4 bg-blue-100  rounded-lg">
      <h3 className="font-semibold mb-4 text-gray-900">Loans Details</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
        <div>
          <div className="text-gray-600 mb-1">Monthly Repayment</div>
          <div className="font-medium">{formatCurrency(loan.monthly_repayment_amount)}</div>
        </div>
        <div>
          <div className="text-gray-600 mb-1">Total Months</div>
          <div className="font-medium">{loan.total_months || "0"}</div>
        </div>
        <div>
          <div className="text-gray-600 mb-1">Paid Months</div>
          <div className="font-medium">{loan.paid_months || "0"}</div>
        </div>
        <div>
          <div className="text-gray-600 mb-1">Remaining Months</div>
          <div className="font-medium">{loan.remaining_months}</div>
        </div>
        <div>
          <div className="text-gray-600 mb-1">Total Loan Amount</div>
          <div className="font-medium">{formatCurrency(loan.total_loan_amount)}</div>
        </div>
        <div>
          <div className="text-gray-600 mb-1">Total Paid</div>
          <div className="font-medium">{formatCurrency(loan.total_paid_amount)}</div>
        </div>
        <div>
          <div className="text-gray-600 mb-1">Remaining Amount</div>
          <div className="font-medium">{formatCurrency(loan.remaining_amount)}</div>
        </div>

      </div>
    </div>
  )
}
