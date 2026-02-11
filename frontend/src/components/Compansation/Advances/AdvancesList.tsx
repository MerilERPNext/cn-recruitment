"use client";
import type React from "react";
import { useEffect, useState } from "react";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";
import InstallmentsList from "./InstallmentsList";
import AdvanceForm from "./AdvanceForm";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { ApiAdvance, UiAdvance } from "../../../types/employeeAttendance";
import { useEmployeeAdvances } from "../../../hooks/useEmployeeAdvances";
import { formatCurrency } from "../../../utils/currencyFormatter";
import Modal from "./commonModal";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import CardTable from "../../shared/CardTable";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import StatusBadge from "../../shared/atoms/statusBadge";
import Tooltip from "../../shared/Tooltip";
import { RupeeSymbolPerfix } from "../../../utils/currency";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";

const AdvancesList: React.FC = () => {
  const [maskAmounts, setMaskAmounts] = useState(true);
  const [selectedAdvance, setSelectedAdvance] = useState<UiAdvance | null>(
    null,
  );
  const [showInstallments, setShowInstallments] = useState(false);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);

  const { isDesktop } = useScreenSize();
  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");
  const employeeId = user?.employee ?? "";
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();
  const {
    data: advancesData,
    refetch,
    isLoading,
  } = useEmployeeAdvances(employeeId || "");

  type AmountRowProps = {
    label: string;
    value: number;
    maskAmounts: boolean;
  };

  const AmountRow = ({ label, value, maskAmounts }: AmountRowProps) => {
    return (
      <div className="mt-0 pt-3">
        <div className="flex justify-between text-sm text-gray-600">
          <span className="text-gray-600 text-xs uppercase tracking-wide">
            {label}
          </span>
          {maskAmounts ? (
            <span className="blur-sm select-none text-gray-400">
              {RupeeSymbolPerfix("XX,XXX")}
            </span>
          ) : (
            <span className="font-medium">{formatCurrency(value)}</span>
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (refetchAttendance) {
      refetch(); // trigger a fresh fetch
      setRefetchAttendance(false); // reset the flag
    }
  }, [refetchAttendance, refetch, setRefetchAttendance]);

  const mapAdvanceData = (apiData: ApiAdvance[]): UiAdvance[] => {
    return apiData.map((a) => ({
      name: a.advance_type,
      amount: a.total_advance_amount,
      numberOfDeductions: a.total_paid_amount,
      startDate: a.start_date,
      endDate: a.end_date,
      advanceStatus: a.status,
      employee_name: a.employee_name,
      installments: a.repayments.map((r) => ({
        installmentNo: r.idx,
        installmentDate: r.payment_date,
        openingBalance: r.balance_amount,
        installmentAmount: r.payment_amount,
        principalBalance: r.deducted,
      })),
    }));
  };

  const formattedData: UiAdvance[] = advancesData
    ? mapAdvanceData(advancesData)
    : [];

  const handleViewInstallments = (advance: UiAdvance) => {
    setSelectedAdvance(advance);
    setShowInstallments(true);
  };

  const handleBackToAdvances = () => {
    setShowInstallments(false);
    setSelectedAdvance(null);
  };

  const handleCreateAdvance = () => {
    setShowAdvanceForm(true);
  };

  const handleCloseModal = () => {
    setShowAdvanceForm(false);
  };

  if (showInstallments && selectedAdvance) {
    return (
      <InstallmentsList
        advance={selectedAdvance}
        onBack={handleBackToAdvances}
        maskAmounts={maskAmounts}
        onToggleMask={() => setMaskAmounts(!maskAmounts)}
      />
    );
  }
  const titles = [
    "Advance Name",
    "Amount",
    "Deductions",
    "Start Date",
    "End Date",
    "Status",
  ];

  const columnWidths = ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];

  const DesktopLayout = () => (
    <>
      {formattedData.map((advance, index) => (
        <div
          key={`${advance.name}-${index}`}
          className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 hover:bg-primary/10 transition-colors cursor-pointer"
          style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr" }}
          onClick={() => handleViewInstallments(advance)}
        >
          {/* Advance Name */}
          <Typography variant="bodySmall" className="font-medium text-center">
            {advance.name}
          </Typography>

          {/* Amount */}
          <Typography variant="bodySmall" className="font-medium text-center">
            {maskAmounts ? (
              <span className="blur-sm select-none text-gray-400">
                {RupeeSymbolPerfix("XX,XXX")}
              </span>
            ) : (
              <span>{formatCurrency(advance.amount)}</span>
            )}
          </Typography>

          {/* Deductions */}
          <Typography variant="bodySmall" className="font-medium text-center">
            {maskAmounts ? (
              <span className="blur-sm select-none text-gray-400">
                {RupeeSymbolPerfix("XX,XXX")}
              </span>
            ) : (
              <span>{advance.numberOfDeductions}</span>
            )}
          </Typography>

          {/* Start Date */}
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(advance.startDate)}
          </Typography>

          {/* End Date */}
          <Typography variant="bodySmall" className="font-medium text-center">
            {formatToIndianDate(advance.endDate)}
          </Typography>

          {/* Status with Tooltip */}
          <div className="flex items-center justify-center">
            <Tooltip content={advance.employee_name}>
              <StatusBadge status={advance.advanceStatus} />
            </Tooltip>
          </div>
        </div>
      ))}
    </>
  );

  const MobileLayout = () => (
    <>
      {formattedData.map((advance, index) => (
        // CHANGED: Using .my-content-card for a consistent card style
        <div
          key={`${advance.name}-${index}`}
          className="my-content-card cursor-pointer"
          onClick={() => handleViewInstallments(advance)}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {advance.name}
              </h3>
            </div>
            <StatusBadge status={advance.advanceStatus} />
          </div>
          <AmountRow
            label="Total Amount"
            value={advance.amount}
            maskAmounts={maskAmounts}
          />

          <AmountRow
            label="Deduction Amount"
            value={advance.numberOfDeductions}
            maskAmounts={maskAmounts}
          />

          <div className="mt-0 pt-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>
                <strong>{formatToIndianDate(advance.startDate)}</strong> to{" "}
                <strong>{formatToIndianDate(advance.endDate)}</strong>
              </span>
              <span>{advance.installments.length} installments</span>
            </div>
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0">
        <div className="px-1 md:px-6 py-1 md:py-4">
          <div className="flex items-center justify-between">
            {isDesktop && (
              <div>
                <Typography variant="h4"> My Advance Request</Typography>
                <Typography variant="bodySmall" color="body2">
                  Track and manage your advance requests
                </Typography>
              </div>
            )}
            <div className="flex items-center justify-between gap-2 w-full md:w-auto">
              <button
                onClick={() => setMaskAmounts(!maskAmounts)}
                className="my-btn-secondary flex items-center gap-2"
                title={maskAmounts ? "Show amounts" : "Hide amounts"}
              >
                {maskAmounts ? (
                  <>
                    <span className="text-sm font-medium text-gray-700">
                      Show Amounts
                    </span>
                    <BsToggleOff className="w-6 h-6 text-gray-400" />
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium text-gray-700">
                      Hide Amounts
                    </span>
                    <BsToggleOn className="w-6 h-6 text-primary" />
                  </>
                )}
              </button>

              {/* Create Advance Button */}
              <Button
                bgColor="primary"
                size="md"
                onClick={handleCreateAdvance}
                className="hover:bg-primary-700 py-[0.65rem] font-semibold"
              >
                Create Advance
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Wrapper */}
      <div className="flex-1 overflow-y-auto md:px-4 pb-4">
        <CardTable titles={titles} columnWidths={columnWidths}>
          {isLoading ? (
            <CardSkeleton />
          ) : formattedData.length > 0 ? (
            isDesktop ? (
              <DesktopLayout />
            ) : (
              <MobileLayout />
            )
          ) : (
            <div className="text-center py-12 px-4 text-gray-500">
              No advances found.
            </div>
          )}
        </CardTable>
      </div>

      {showAdvanceForm && (
        <Modal onClose={handleCloseModal}>
          <AdvanceForm user={user} onClose={handleCloseModal} />
        </Modal>
      )}
    </div>
  );
};

export default AdvancesList;
