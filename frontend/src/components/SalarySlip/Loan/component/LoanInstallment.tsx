import { EditIcon } from "lucide-react";
import { Installment } from "../Type/loan";

interface LoanInstallmentsProps {
  installments: Installment[];
}

export default function LoanInstallments({ installments }: LoanInstallmentsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-IN").format(num);
  };

  return (
    <div>
      <h3 className="font-semibold mb-4 text-gray-900">Loans Breakup Details</h3>

      <div className="overflow-x-auto border rounded">
        {/* Header */}
        <div className="grid grid-cols-10 bg-gray-200 rounded-t border-b text-sm font-medium text-gray-700">
          <div className="p-3">Installment</div>
          <div className="p-3">Installment Month</div>
          <div className="p-3">Opening Balance</div>
          <div className="p-3">Installment Amount</div>
          <div className="p-3">Interest (1)</div>
          <div className="p-3">Loans EMI</div>
          <div className="p-3">Standard Interest (2)</div>
          <div className="p-3">Principal Balance</div>
          <div className="p-3">Perquisites</div>
          <div className="p-3">Operations</div>
        </div>

        {/* Rows */}
        <div className="text-sm divide-y divide-gray-200">
          {installments.map((installment, index) => (
            <div
              key={installment.id || index}
              className="grid grid-cols-10 hover:bg-gray-50 transition-colors"
            >
              <div className="p-3">{index + 1}</div>
              <div className="p-3">{installment.payment_date}</div>
              <div className="p-3">
                {formatCurrency(
                  installment.balance_loan_amount + installment.principal_amount
                )}
              </div>
              <div className="p-3">{formatCurrency(installment.total_payment)}</div>
              <div className="p-3">{formatNumber(installment.interest_amount)}</div>
              <div className="p-3">{formatCurrency(installment.total_payment)}</div>
              <div className="p-3">{formatNumber(installment.interest_amount)}</div>
              <div className="p-3">{formatCurrency(installment.principal_amount)}</div>
              <div className="p-3">-</div>
              <div className="p-3">
                <button className="p-1 h-8 w-8 hover:bg-gray-100 rounded transition-colors">
                  <div className="text-blue-600">
                    <EditIcon />
                  </div>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
