import formatToIndianDate from "../../../../utils/formatToIndianDate";
import CardTable from "../../../shared/CardTable";
import { Installment } from "../Type/loan";

interface LoanInstallmentsProps {
  installments: Installment[];
}

export default function LoanInstallments({
  installments,
}: LoanInstallmentsProps) {
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
  const titles = [
    "",
    "Loan Name",
    "Loan Type",
    "Loan Amount",
    "Rate of Interest",
    "Standard Interest",
    "EMI Type",
    "Installments",
    "Start Date",
    "End Month",
    "Status",
  ];

  const columnWidths = [
    "3rem",
    "1.5fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
  ];

  return (
    <div>
      <h3 className=" card-title  mb-4">Loans Breakup Details</h3>
      <CardTable titles={titles} columnWidths={columnWidths}>
        <div className="card-subtitle  divide-y divide-gray-200">
          {installments.length > 0 ? (
            installments.map((installment, index) => (
              <div
                key={installment.id || index}
                className="hover:bg-primary/10 grid gap-4 px-6 py-2"
                style={{ gridTemplateColumns: columnWidths.join(" ") }}
              >
                <div className=" ">{index + 1}</div>
                <div className=" ">
                  {formatToIndianDate(installment.payment_date)}
                </div>

                <div className=" ">
                  {formatCurrency(
                    installment.balance_loan_amount +
                      installment.principal_amount,
                  )}
                </div>
                <div className=" ">
                  {formatCurrency(installment.total_payment)}
                </div>
                <div className=" ">
                  {formatNumber(installment.interest_amount)}
                </div>
                <div className=" ">
                  {formatCurrency(installment.total_payment)}
                </div>
                <div className=" ">
                  {formatNumber(installment.interest_amount)}
                </div>
                <div className=" ">
                  {formatCurrency(installment.principal_amount)}
                </div>
                <div className=" ">0</div>
                <div className=" ">0</div>
                <div className=" ">0</div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-4">
              No installments available.
            </div>
          )}
        </div>
      </CardTable>
    </div>
  );
}
