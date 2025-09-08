import { LockIcon, EditIcon } from "lucide-react"
import { Installment } from "../Type/loan"


interface LoanInstallmentsProps {
  installments: Installment[]
}

export default function LoanInstallments({ installments }: LoanInstallmentsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-IN").format(num)
  }

  return (
    <div>
      <h3 className="font-semibold mb-4 text-gray-900">Loans Breakup Details</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-3 font-medium text-gray-700">Installment</th>
              <th className="text-left p-3 font-medium text-gray-700">Installment Month</th>
              <th className="text-left p-3 font-medium text-gray-700">Opening Balance</th>
              <th className="text-left p-3 font-medium text-gray-700">Installment Amount</th>
              <th className="text-left p-3 font-medium text-gray-700">Interest (1)</th>
              <th className="text-left p-3 font-medium text-gray-700">Loans EMI</th>
              <th className="text-left p-3 font-medium text-gray-700">Standard Interest (2)</th>
              <th className="text-left p-3 font-medium text-gray-700">Principal Balance</th>
              <th className="text-left p-3 font-medium text-gray-700">Perquisites</th>
              <th className="text-left p-3 font-medium text-gray-700">Operations</th>
            </tr>
          </thead>
          <tbody>
            {installments.map((installment) => (
              <tr key={installment.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{installment.id}</td>
                <td className="p-3">{installment.month}</td>
                <td className="p-3">{formatCurrency(installment.openingBalance)}</td>
                <td className="p-3">{formatCurrency(installment.installmentAmount)}</td>
                <td className="p-3">{formatNumber(installment.interest)}</td>
                <td className="p-3">{formatCurrency(installment.loanEmi)}</td>
                <td className="p-3">{formatNumber(installment.standardInterest)}</td>
                <td className="p-3">{formatCurrency(installment.principalBalance)}</td>
                <td className="p-3">{installment.perquisites}</td>
                <td className="p-3">
                  {installment.isLocked ? (
                    <div className="text-gray-400">
                      <LockIcon />
                    </div>
                  ) : (
                    <button className="p-1 h-8 w-8 hover:bg-gray-100 rounded transition-colors">
                      <div className="text-blue-600">
                        <EditIcon />
                      </div>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
