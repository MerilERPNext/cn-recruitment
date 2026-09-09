import { useState } from "react";
import { CiLock } from "react-icons/ci";
import { Pause, SquarePen } from "lucide-react";
import { formatCurrency } from "../../../../utils/currency";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import { Typography } from "../../../shared/atoms/Typography";
import { NoDataFound } from "../../../shared/atoms/NoDataFound";
import CardTable from "../../../shared/CardTable";
import { Installment } from "../Type/loan";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import { useCurrentEmployeeDetails } from "../../../../hooks/useEmployee";
import { useLoanAdminPermission } from "../../../../hooks/useLoan";
import Tooltip from "../../../shared/Tooltip";
import LoanInstallmentModal from "./LoanInstallmentModal";

interface LoanInstallmentsProps {
  installments: Installment[];
  standardInterest?: number;
  docId?: string;
}

export default function LoanInstallments({
  installments,
  standardInterest = 0,
  docId,
}: LoanInstallmentsProps) {
  const { data: user } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { data: currentUser } = useCurrentUser();
  const { data: adminRoles = [] } = useLoanAdminPermission(user?.employee);

  // Check admin permission strictly based on Payroll Admin and API-returned roles as done in isPayrollAdmin
  const hasAdminPermission =
    currentUser?.roles?.some((r) =>
      ["Payroll Admin", ...adminRoles].includes(r.role)
    ) ?? false;


  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: "hold" | "edit";
    installment: Installment | null;
  }>({
    isOpen: false,
    mode: "hold",
    installment: null,
  });

  const handleOpenModal = (mode: "hold" | "edit", installment: Installment) => {
    setModalState({
      isOpen: true,
      mode,
      installment,
    });
  };

  const handleCloseModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const titles = [
    "Installment",
    "Installment Month",
    "Opening Balance",
    "Installment Amount",
    "Loans EMI",
    `Standard Interest (${standardInterest})`,
    "Principal Balance",
    "Perquisites",
    "ACTIONS",
  ];

  const columnWidths = [
    "0.8fr",
    "1fr",
    "1fr",
    "1.2fr",
    "1fr",
    "1.5fr",
    "1.2fr",
    "1fr",
    "1.2fr",
  ];

  return (
    <div className="sticky left-0 w-max max-w-[calc(100vw-32px)] md:max-w-[calc(100vw-280px)]">
      <Typography variant="h4" className="mb-2">
        Loans Breakup Details
      </Typography>

      <CardTable titles={titles} columnWidths={columnWidths}>
        {installments.length > 0 ? (
          installments.map((installment, index) => {
            const formattedDate = installment.payment_date ? formatToIndianDate(installment.payment_date) : "-";

            // Recompute opening balance if not provided directly
            const openingBalance =
              (installment.balance_loan_amount || 0) +
              (installment.principal_amount || 0);


            return (
              <div
                key={index}
                className="grid items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
                style={{ gridTemplateColumns: columnWidths.join(" ") }}
              >
                {/* Installment */}
                <Typography variant="bodySmall" className="text-center">
                  {index + 1}
                </Typography>

                {/* Installment Month */}
                <Typography variant="bodySmall" className="text-center">
                  {formattedDate}
                </Typography>

                {/* Opening Balance */}
                <Typography variant="bodySmall" className="text-center">
                  {formatCurrency(openingBalance)}
                </Typography>

                {/* Installment Amount */}
                <Typography variant="bodySmall" className="text-center">
                  {formatCurrency(installment.principal_amount)}
                </Typography>

                {/* Loans EMI */}
                <Typography variant="bodySmall" className="text-center">
                  {formatCurrency(installment.total_payment)}
                </Typography>

                {/* Standard Interest */}
                <Typography variant="bodySmall" className="text-center">
                  {formatCurrency(installment.interest_amount)}
                </Typography>

                {/* Principal Balance */}
                <Typography variant="bodySmall" className="text-center">
                  {formatCurrency(installment.balance_loan_amount)}
                </Typography>

                {/* Perquisites */}
                <Typography variant="bodySmall" className="text-center">
                  {installment.perquisite_amount}
                </Typography>

                {/* ACTIONS */}
                <div className="flex items-center justify-center">
                  {hasAdminPermission ? (
                    <div className="h-8 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-10 w-fit">
                      <Tooltip content="Hold" position="top">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal("hold", installment);
                          }}
                          className="p-1 text-amber-600 hover:text-amber-700 transition-colors flex items-center justify-center"
                          aria-label="Hold installment"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      </Tooltip>
                      <span className="w-px h-4 bg-gray-300" />
                      <Tooltip content="Edit" position="top">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal("edit", installment);
                          }}
                          className="p-1 text-primary hover:text-primary-600 transition-colors flex items-center justify-center"
                          aria-label="Edit installment"
                        >
                          <SquarePen className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-lg">
                      <CiLock />
                    </div>
                  )}
                </div>


              </div>
            );
          })
        ) : (
          <NoDataFound
            title="No Installments"
            subtitle="No installment data available."
          />
        )}
      </CardTable>

      <LoanInstallmentModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        mode={modalState.mode}
        installment={modalState.installment}
        docId={docId}
      />
    </div>
  );
}

