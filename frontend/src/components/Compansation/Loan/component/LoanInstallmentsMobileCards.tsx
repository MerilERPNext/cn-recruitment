import { useState } from "react";
import { CiLock } from "react-icons/ci";
import { Pause, SquarePen } from "lucide-react";
import { formatCurrency } from "../../../../utils/currency";
import { formatDateDDMonthYYYY } from "../../../../utils/formatToIndianDate";
import { Typography } from "../../../shared/atoms/Typography";
import { NoDataFound } from "../../../shared/atoms/NoDataFound";
import { Installment } from "../Type/loan";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import { useCurrentEmployeeDetails } from "../../../../hooks/useEmployee";
import { useLoanAdminPermission } from "../../../../hooks/useLoan";
import Tooltip from "../../../shared/Tooltip";
import LoanInstallmentModal from "./LoanInstallmentModal";

interface LoanInstallmentsMobileCardsProps {
  installments: Installment[];
  standardInterest?: number;
  docId?: string;
}

export default function LoanInstallmentsMobileCards({
  installments,
  docId,
}: LoanInstallmentsMobileCardsProps) {
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

  if (!installments || installments.length === 0) {
    return (
      <div className="py-6">
        <Typography variant="subheading" color="body1" className="mb-3">
          Loans Breakup Details
        </Typography>
        <NoDataFound
          title="No Installments Found"
          subtitle="No installment schedule available for this loan."
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <Typography variant="subheading" color="body1" className="px-1">
        Loans Breakup Details
      </Typography>

      {/* Responsive Grid: 1 col on mobile, 2 cols on large mobile/tablet */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {installments.map((installment, index) => {
          const openingBalance =
            (installment.balance_loan_amount || 0) +
            (installment.principal_amount || 0);

          return (
            <div
              key={index}
              className="border-t-4 border-x border-b border-x-primary/20 border-b-primary/20 border-t-primary shadow-sm bg-white rounded-xl p-4 space-y-3"
            >
              {/* Card Header: Installment Index + Date + Action Pill */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-xl inline-block">
                    Installment #{index + 1}
                  </span>
                  <div className="text-sm font-semibold text-gray-900 pt-0.5">
                    {installment.payment_date
                      ? formatDateDDMonthYYYY(installment.payment_date)
                      : "-"}
                  </div>
                </div>

                {/* Actions matching desktop */}
                <div>
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

              {/* Card Details Grid (2 columns) */}
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                <div>
                  <Typography
                    variant="mobileCardLabel"
                    className="text-xs text-gray-500 font-medium block mb-0.5"
                  >
                    Opening Balance
                  </Typography>
                  <Typography
                    variant="mobileCardValue"
                    className="text-sm font-semibold text-gray-900 block"
                  >
                    {formatCurrency(openingBalance)}
                  </Typography>
                </div>

                <div className="text-right">
                  <Typography
                    variant="mobileCardLabel"
                    className="text-xs text-gray-500 font-medium block mb-0.5"
                  >
                    Installment Amount
                  </Typography>
                  <Typography
                    variant="mobileCardValue"
                    className="text-sm font-semibold text-gray-900 block"
                  >
                    {formatCurrency(installment.total_payment || 0)}
                  </Typography>
                </div>

                <div>
                  <Typography
                    variant="mobileCardLabel"
                    className="text-xs text-gray-500 font-medium block mb-0.5"
                  >
                    Loans EMI
                  </Typography>
                  <Typography
                    variant="mobileCardValue"
                    className="text-sm font-semibold text-gray-900 block"
                  >
                    {formatCurrency(installment.principal_amount || 0)}
                  </Typography>
                </div>

                <div className="text-right">
                  <Typography
                    variant="mobileCardLabel"
                    className="text-xs text-gray-500 font-medium block mb-0.5"
                  >
                    Standard Interest
                  </Typography>
                  <Typography
                    variant="mobileCardValue"
                    className="text-sm font-semibold text-gray-900 block"
                  >
                    {formatCurrency(installment.interest_amount || 0)}
                  </Typography>
                </div>

                <div>
                  <Typography
                    variant="mobileCardLabel"
                    className="text-xs text-gray-500 font-medium block mb-0.5"
                  >
                    Principal Balance
                  </Typography>
                  <Typography
                    variant="mobileCardValue"
                    className="text-sm font-semibold text-gray-900 block"
                  >
                    {formatCurrency(installment.balance_loan_amount || 0)}
                  </Typography>
                </div>

                <div className="text-right">
                  <Typography
                    variant="mobileCardLabel"
                    className="text-xs text-gray-500 font-medium block mb-0.5"
                  >
                    Perquisites
                  </Typography>
                  <Typography
                    variant="mobileCardValue"
                    className="text-sm font-semibold text-gray-900 block"
                  >
                    {installment.perquisite_amount ?? "0"}
                  </Typography>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
