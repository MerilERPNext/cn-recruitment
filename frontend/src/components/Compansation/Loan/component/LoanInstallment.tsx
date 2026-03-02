import { formatCurrency } from "../../../../utils/currency";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import { Typography } from "../../../shared/atoms/Typography";
import CardTable from "../../../shared/CardTable";
import { Installment } from "../Type/loan";

interface LoanInstallmentsProps {
  installments: Installment[];
}

export default function LoanInstallments({
  installments,
}: LoanInstallmentsProps) {
  const titles = [
    "#",
    "Payment Date",
    "Loan Amount",
    "EMI Amount",
    "Interest",
    "Principal",
  ];

  const columnWidths = ["3rem", "1fr", "1fr", "1fr", "1fr", "1fr"];

  return (
    <div>
      <Typography variant="h4" className="mb-2">
        Loans Breakup Details
      </Typography>

      <CardTable titles={titles} columnWidths={columnWidths}>
        {installments.length > 0 ? (
          installments.map((installment, index) => (
            <div
              key={index}
              className="grid items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
              style={{ gridTemplateColumns: columnWidths.join(" ") }}
            >
              {/* # */}
              <Typography variant="bodySmall" className="text-center">
                {index + 1}
              </Typography>

              {/* Payment Date */}
              <Typography variant="bodySmall" className="text-center">
                {formatToIndianDate(installment.payment_date)}
              </Typography>

              {/* Loan Amount */}
              <Typography variant="bodySmall" className="text-center">
                {formatCurrency(
                  installment.balance_loan_amount +
                    installment.principal_amount,
                )}
              </Typography>

              {/* EMI */}
              <Typography variant="bodySmall" className="text-center">
                {formatCurrency(installment.total_payment)}
              </Typography>

              {/* Interest Amount */}
              <Typography variant="bodySmall" className="text-center">
                {formatCurrency(installment.interest_amount)}
              </Typography>

              {/* Principal */}
              <Typography variant="bodySmall" className="text-center">
                {formatCurrency(installment.principal_amount)}
              </Typography>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 py-4">
            No installments available.
          </div>
        )}
      </CardTable>
    </div>
  );
}
