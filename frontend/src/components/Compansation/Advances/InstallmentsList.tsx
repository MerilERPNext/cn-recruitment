
import { X } from "lucide-react";
import type React from "react";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { Installment, UiAdvance } from "../../../types/employeeAttendance";
import { formatCurrency } from "../../../utils/currency";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import HeaderBar from "../../HeaderBar";
import CardTable from "../../shared/CardTable";
import { Card } from "../../shared/atoms/Card";
import { Typography } from "../../shared/atoms/Typography";
import StatusBadge from "../../shared/atoms/statusBadge";
import Button from "../../shared/atoms/Button";
import ShowHideButton from "../ui/ShowHideButton";

interface InstallmentsListProps {
  advance: UiAdvance;
  onBack: () => void;
  maskAmounts: boolean;
  onToggleMask: () => void;
}

const InstallmentsList: React.FC<InstallmentsListProps> = ({
  advance,
  onBack,
  maskAmounts,
  onToggleMask,
}) => {
  const { isDesktop } = useScreenSize();

  const DesktopLayout = () => (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0">
        <div className="px-4 py-1 md:py-2">
          <div className="border-b mb-1 border-gray-10">
            <HeaderBar
              title={`Installments - ${advance.name}`}
              showBackButton={true}
              onBack={onBack}
              rightSlot={
                // CHANGED: Using .btn-secondary for consistent button styling.
                <ShowHideButton showAmount={maskAmounts} onToggleAmount={onToggleMask} />
              }
            />
          </div>
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-center">
              <div>
                <span className="text-gray-600">Total Amount:</span>
                <div className="font-semibold">
                  {maskAmounts ? (
                    <span className="blur-sm select-none">
                      {formatCurrency("XX,XXX")}
                    </span>
                  ) : (
                    formatCurrency(advance.amount)
                  )}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Period:</span>
                <div className="font-semibold">
                  {formatToIndianDate(advance.startDate)} to{" "}
                  {formatToIndianDate(advance.endDate)}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <br />
                <StatusBadge status={advance.advanceStatus} />
              </div>
              <div>
                <span className="text-gray-600">Total Installments:</span>
                <div className="font-semibold">
                  {advance.installments.length}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        <CardTable
          titles={[
            "Installment No.",
            "Date",
            "Opening Balance",
            "Installment Amount",
            "Principal Balance",
          ]}
          columnWidths={["1fr", "1fr", "1fr", "1fr", "1fr"]}
        >
          {advance.installments.map(
            (installment: Installment, index: number) => (
              <div
                key={`${installment.installmentNo}-${index}`}
                className="grid items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
                style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr" }}
              >
                <Typography
                  variant="bodySmall"
                  className="text-center font-medium"
                >
                  .{installment.installmentNo}
                </Typography>

                <Typography
                  variant="bodySmall"
                  className="text-center font-medium"
                >
                  {formatToIndianDate(installment.installmentDate)}
                </Typography>

                <Typography
                  variant="bodySmall"
                  className="text-center font-medium"
                >
                  {maskAmounts ? (
                    <span className="blur-sm select-none">
                      {formatCurrency("XX,XXX")}
                    </span>
                  ) : (
                    <span>{formatCurrency(installment.openingBalance)}</span>
                  )}
                </Typography>

                <Typography
                  variant="bodySmall"
                  className="text-center font-medium"
                >
                  {maskAmounts ? (
                    <span className="blur-sm select-none">
                      {formatCurrency("XX,XXX")}
                    </span>
                  ) : (
                    <span>{formatCurrency(installment.installmentAmount)}</span>
                  )}
                </Typography>

                <Typography
                  variant="bodySmall"
                  className="text-center font-medium"
                >
                  {maskAmounts ? (
                    <span className="blur-sm select-none">
                      {formatCurrency("XX,XXX")}
                    </span>
                  ) : (
                    <span>{formatCurrency(installment.principalBalance)}</span>
                  )}
                </Typography>
              </div>
            ),
          )}
        </CardTable>
      </div>
    </div>
  );

  // NOTE: Mobile layout matches the ExpenseClaimDetailsModal / LoanDetailsForMobile pattern.
  const MobileLayout = () => (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="w-full h-full bg-white flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <Typography
            variant="bodyMedium"
            className="font-semibold text-gray-900 leading-tight"
          >
            Installments - {advance.name}
          </Typography>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMask}
              className="p-2"
              title={maskAmounts ? "Show amounts" : "Hide amounts"}
            >
              {maskAmounts ? (
                <BsToggleOff className="w-6 h-6 text-gray-400" />
              ) : (
                <BsToggleOn className="w-6 h-6 text-primary" />
              )}
            </button>

            <Button
              variant="subtle"
              onClick={onBack}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-4">
          {/* Summary — paired rows */}
          <div className="flex gap-2 justify-between p-1">
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel" className="block">
                Period
              </Typography>
              <Typography variant="mobileCardValue">
                {formatToIndianDate(advance.startDate)} to{" "}
                {formatToIndianDate(advance.endDate)}
              </Typography>
            </div>
            <div>
              <StatusBadge status={advance.advanceStatus} />
            </div>
          </div>

          <div className="flex flex-col items-start justify-between mt-2 rounded-md p-1 gap-4">
            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-2">
                <Typography variant="mobileCardLabel">Total Amount</Typography>
                <Typography variant="mobileCardValue">
                  {maskAmounts ? (
                    <span className="blur-sm select-none">
                      {formatCurrency("XX,XXX")}
                    </span>
                  ) : (
                    formatCurrency(advance.amount)
                  )}
                </Typography>
              </div>
              <div className="flex flex-col gap-2 text-right">
                <Typography variant="mobileCardLabel" className="block">
                  Total Installments
                </Typography>
                <Typography variant="mobileCardValue">
                  {advance.installments.length}
                </Typography>
              </div>
            </div>
          </div>

          {/* Installment Items — card-style like Expense Claim Items */}
          <div className="mt-4">
            <Typography
              variant="bodySmall"
              className="base-title mb-2 font-bold block"
            >
              Installment Breakup
            </Typography>

            {advance.installments.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {advance.installments.map(
                  (installment: Installment, index: number) => (
                    <div
                      key={`${installment.installmentNo}-${index}`}
                      className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
                    >
                      <div className="mb-3">
                        <Typography variant="label" className="card-title">
                          Installment #{installment.installmentNo}
                        </Typography>
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        <div className="flex flex-col gap-1">
                          <Typography
                            variant="mobileCardLabel"
                            className="block"
                          >
                            Date
                          </Typography>
                          <Typography variant="mobileCardValue">
                            {formatToIndianDate(installment.installmentDate)}
                          </Typography>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Typography
                            variant="mobileCardLabel"
                            className="block"
                          >
                            Opening Balance
                          </Typography>
                          <Typography variant="mobileCardValue">
                            {maskAmounts ? (
                              <span className="blur-sm select-none">
                                {formatCurrency("XX,XXX")}
                              </span>
                            ) : (
                              formatCurrency(installment.openingBalance)
                            )}
                          </Typography>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Typography
                            variant="mobileCardLabel"
                            className="block"
                          >
                            Installment Amount
                          </Typography>
                          <Typography variant="mobileCardValue">
                            {maskAmounts ? (
                              <span className="blur-sm select-none">
                                {formatCurrency("XX,XXX")}
                              </span>
                            ) : (
                              formatCurrency(installment.installmentAmount)
                            )}
                          </Typography>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Typography
                            variant="mobileCardLabel"
                            className="block"
                          >
                            Principal Balance
                          </Typography>
                          <Typography variant="mobileCardValue">
                            {maskAmounts ? (
                              <span className="blur-sm select-none">
                                {formatCurrency("XX,XXX")}
                              </span>
                            ) : (
                              <span>
                                {formatCurrency(installment.principalBalance)}
                              </span>
                            )}
                          </Typography>
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="py-6 text-center border border-gray-200 rounded-lg bg-gray-50 mt-2">
                <Typography variant="mobileCardValue" className="text-gray-500">
                  No installment data available.
                </Typography>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return <>{isDesktop ? <DesktopLayout /> : <MobileLayout />}</>;
};

export default InstallmentsList;
