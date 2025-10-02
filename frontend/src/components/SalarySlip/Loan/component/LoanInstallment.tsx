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
        {/* CHANGED: Using .my-table-header and .my-table-header-text */}
        <div className="my-table-header grid grid-cols-9 rounded-t">
          <div className="my-table-header-text">Installment</div>
          <div className="my-table-header-text">Installment Month</div>
          <div className="my-table-header-text">Opening Balance</div>
          <div className="my-table-header-text">Installment Amount</div>
          <div className="my-table-header-text">Interest (1)</div>
          <div className="my-table-header-text">Loans EMI</div>
          <div className="my-table-header-text">Standard Interest (2)</div>
          <div className="my-table-header-text">Principal Balance</div>
          <div className="my-table-header-text">Perquisites</div>
        </div>

        <div className="text-sm divide-y divide-gray-200">
          {installments.map((installment, index) => (
            // CHANGED: Using .my-data-row and .my-data-cell
            <div
              key={installment.id || index}
              className="my-data-row grid grid-cols-9"
            >
              <div className="my-data-cell">{index + 1}</div>
              <div className="my-data-cell">{installment.payment_date}</div>
              <div className="my-data-cell">{formatCurrency(installment.balance_loan_amount + installment.principal_amount)}</div>
              <div className="my-data-cell">{formatCurrency(installment.total_payment)}</div>
              <div className="my-data-cell">{formatNumber(installment.interest_amount)}</div>
              <div className="my-data-cell">{formatCurrency(installment.total_payment)}</div>
              <div className="my-data-cell">{formatNumber(installment.interest_amount)}</div>
              <div className="my-data-cell">{formatCurrency(installment.principal_amount)}</div>
              <div className="my-data-cell">-</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}