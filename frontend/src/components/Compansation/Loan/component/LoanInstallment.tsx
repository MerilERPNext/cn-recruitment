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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-IN").format(num);
  };
  const titles = [
    "#",
    "Loan Name",
    "Loan Type",
    "Loan Amount",
    "Rate of Interest",
    "Standard Interest",
    "EMI Type",
    "Installments",
    "Start Date",
    "End Month",
    // "Status",
  ];

  const columnWidths = [
    "3rem",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    // "1fr",
  ];

  return (
    <div>
      <Typography variant="h4" className="mb-2">
        Loans Breakup Details
      </Typography>

      <CardTable titles={titles} columnWidths={columnWidths}>
        {installments.length > 0 ? (
          installments.map((installment, index) => (
            <div
              key={installment.id || index}
              className="grid items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
              style={{ gridTemplateColumns: columnWidths.join(" ") }}
            >
              <Typography
                variant="bodySmall"
                className="font-medium text-center"
              >
                {index + 1}{" "}
              </Typography>

              <Typography
                variant="bodySmall"
                className="font-medium text-center"
              >
                {formatToIndianDate(installment.payment_date)}
              </Typography>

              <Typography
                variant="bodySmall"
                className="font-medium text-center"
              >
                {formatCurrency(
                  installment.balance_loan_amount +
                  installment.principal_amount,
                )}
              </Typography>

              <Typography
                variant="bodySmall"
                className="font-medium text-center"
              >
                {formatCurrency(installment.total_payment)}
              </Typography>

              <Typography
                variant="bodySmall"
                className="font-medium text-center"
              >
                {formatNumber(installment.interest_amount)}
              </Typography>

              <Typography
                variant="bodySmall"
                className="font-medium text-center"
              >
                {formatCurrency(installment.total_payment)}
              </Typography>

              <Typography
                variant="bodySmall"
                className="font-medium text-center"
              >
                {formatNumber(installment.interest_amount)}
              </Typography>

              <Typography
                variant="bodySmall"
                className="font-medium text-center"
              >
                {formatCurrency(installment.principal_amount)}
              </Typography>

              <Typography
                variant="bodySmall"
                className="font-medium text-center"
              >
                {installment?.loan_start_date}
              </Typography>

              <Typography
                variant="bodySmall"
                className="font-medium text-center"
              >
                {installment?.loan_end_date}
              </Typography>

              {/* <Typography
                variant="bodySmall"
                className="font-medium text-center"
              >
                0
              </Typography> */}
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
