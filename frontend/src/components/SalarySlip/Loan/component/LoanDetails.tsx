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
    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-4 text-gray-900">Loans Details</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
        <div>
          <div className="text-gray-600 mb-1">Pending Months</div>
          <div className="font-medium">{loan.pendingMonths}</div>
        </div>
        <div>
          <div className="text-gray-600 mb-1">Total Principal</div>
          <div className="font-medium">{formatCurrency(loan.totalPrincipal)}</div>
        </div>
        <div>
          <div className="text-gray-600 mb-1">Total Principal with Interest</div>
          <div className="font-medium">{formatCurrency(loan.totalPrincipalWithInterest)}</div>
        </div>
        <div>
          <div className="text-gray-600 mb-1">Paid Principal</div>
          <div className="font-medium">{formatCurrency(loan.paidPrincipal)}</div>
        </div>
        <div>
          <div className="text-gray-600 mb-1">Paid Principal with Interest</div>
          <div className="font-medium">{formatCurrency(loan.paidPrincipalWithInterest)}</div>
        </div>
        <div>
          <div className="text-gray-600 mb-1">Pending Principal</div>
          <div className="font-medium">{formatCurrency(loan.pendingPrincipalAmount)}</div>
        </div>
        <div>
          <div className="text-gray-600 mb-1">Pending Principal with Interest</div>
          <div className="font-medium">{formatCurrency(loan.pendingPrincipalWithInterest)}</div>
        </div>
      </div>
    </div>
  )
}
