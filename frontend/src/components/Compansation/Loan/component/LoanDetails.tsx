import { formatCurrency } from "../../../../utils/currency"
import { Card } from "../../../shared/atoms/Card"
import { Typography } from "../../../shared/atoms/Typography"
import { Loan } from "../Type/loan"

interface LoanDetailsProps {
  loan: Loan
}

export default function LoanDetails({ loan }: LoanDetailsProps) {


  return (
    // CHANGED: Using the reusable .my-info-card class for consistency.
    <Card className="mb-6 sticky left-0 w-max max-w-[calc(100vw-32px)] md:max-w-[calc(100vw-280px)]" >
      <Typography variant="subheading" color="body1" className="mb-4">Loans Details</Typography>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4 text-sm">
        <div>
          <div className="text-gray-400 mb-1">Pending Months</div>
          <div className="font-medium">{loan.remaining_months ?? "0"}</div>
        </div>
        <div>
          <div className="text-gray-400 mb-1">Total Principal</div>
          <div className="font-medium">{formatCurrency(loan.total_principal || 0)}</div>
        </div>
        <div>
          <div className="text-gray-400 mb-1">Paid Principal</div>
          <div className="font-medium">{formatCurrency(loan.paid_principal || 0)}</div>
        </div>
        
        <div>
          <div className="text-gray-400 mb-1">Pending Principal</div>
          <div className="font-medium">{formatCurrency(loan.pending_principal || 0)}</div>
        </div>
        <div>
          <div className="text-gray-400 mb-1">Total Principal with Interest</div>
          <div className="font-medium">{formatCurrency(loan.total_principal_interest || 0)}</div>
        </div>
        <div>
          <div className="text-gray-400 mb-1">Paid Principal with Interest</div>
          <div className="font-medium">{formatCurrency(loan.paid_principal_with_interest || 0)}</div>
        </div>

        <div>
          <div className="text-gray-400 mb-1">Pending Principal with Interest</div>
          <div className="font-medium">{formatCurrency(loan.pending_principal_with_interest || 0)}</div>
        </div>
      </div>
    </Card>
  )
}