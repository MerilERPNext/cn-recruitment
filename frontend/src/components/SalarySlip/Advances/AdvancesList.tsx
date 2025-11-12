"use client";
import type React from "react";
import { useEffect, useState } from "react";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";
import InstallmentsList from "./InstallmentsList";
import { StatusBadge } from "./StatusBadge";
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

const AdvancesList: React.FC = () => {
  const [maskAmounts, setMaskAmounts] = useState(true);
  const [selectedAdvance, setSelectedAdvance] = useState<UiAdvance | null>(
    null
  );
  const [showInstallments, setShowInstallments] = useState(false);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);

  const { isDesktop } = useScreenSize();
  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");
  const employeeId = user?.employee ?? "";
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();
  const { data: advancesData, refetch } = useEmployeeAdvances(employeeId || "");

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

  const DesktopLayout = () => (
    <div className="min-h-screen max-w-[100vw] overflow-x-hidden">
      <div className="w-full max-w-[100vw] mx-auto py-0">
        <div className="mb-6 w-full px-0">
          <div className="flex items-center justify-end gap-4">
            {/* CHANGED: Using .my-btn-secondary */}
            <button
              onClick={() => setMaskAmounts(!maskAmounts)}
              className="my-btn-secondary"
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
                  <BsToggleOn className="w-6 h-6 text-primary" />{" "}
                  {/* CHANGED: Using brand color */}
                </>
              )}
            </button>
            {/* CHANGED: Using .my-btn-primary */}
            <button
              onClick={handleCreateAdvance}
              className="my-btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              Create Advance
            </button>
          </div>
        </div>

        <div className="px-0">
          <div className="rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* CHANGED: Using .my-table-header */}
            <div className="my-table-header">
              <div className="grid grid-cols-6 gap-4">
                {/* CHANGED: Using .my-table-header-text on all header titles */}
                <div className="my-table-header-text">Advance Name</div>
                <div className="my-table-header-text text-center">Amount</div>
                <div className="my-table-header-text text-center">
                  Deductions
                </div>
                <div className="my-table-header-text text-center">
                  Start Date
                </div>
                <div className="my-table-header-text text-center">End Date</div>
                <div className="my-table-header-text text-center">Status</div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {formattedData.map((advance, index) => (
                // CHANGED: Using .table-row and grid layout. Children use .my-data-cell
                <div
                  key={`${advance.name}-${index}`}
                  className="my-data-row grid grid-cols-6 gap-4 cursor-pointer"
                  onClick={() => handleViewInstallments(advance)}
                >
                  <div className="my-data-cell font-medium">{advance.name}</div>
                  <div className="my-data-cell text-center">
                    {maskAmounts ? (
                      <span className="blur-sm select-none text-gray-400">
                        ₹XX,XXX
                      </span>
                    ) : (
                      <span className="font-medium">
                        {formatCurrency(advance.amount)}
                      </span>
                    )}
                  </div>
                  <div className="my-data-cell text-center">
                    {maskAmounts ? (
                      <span className="blur-sm select-none text-gray-400">
                        ₹XX,XXX
                      </span>
                    ) : (
                      <span className="font-medium">
                        {advance.numberOfDeductions}
                      </span>
                    )}
                  </div>
                  <div className="my-data-cell text-center">
                    {formatToIndianDate(advance.startDate)}
                  </div>
                  <div className="my-data-cell text-center">
                    {formatToIndianDate(advance.endDate)}
                  </div>
                  <div className="my-data-cell text-center relative group inline-block overflow-visible">
                    <StatusBadge status={advance.advanceStatus} />

                    {/* Tooltip */}
                    <div
                      className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
               opacity-0 invisible group-hover:opacity-100 group-hover:visible
               transition-all duration-150 ease-out pointer-events-none
               bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap
               shadow-lg z-50"
                    >
                      dummy email : anilr5364@gmail.com
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {formattedData.length === 0 && (
          <div className="text-center py-12 px-4">
            <p className="text-gray-500">No advances found.</p>
          </div>
        )}
      </div>
    </div>
  );

  const MobileLayout = () => (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="p-0 space-y-3">
        <div className="flex items-center justify-between gap-4">
          {/* CHANGED: Using .my-btn-secondary */}
          <button
            onClick={() => setMaskAmounts(!maskAmounts)}
            className="my-btn-secondary"
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
                <BsToggleOn className="w-6 h-6 text-primary" />{" "}
                {/* CHANGED: Using brand color */}
              </>
            )}
          </button>
          {/* CHANGED: Using .my-btn-primary */}
          <button
            onClick={handleCreateAdvance}
            className="my-btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            Create Advance
          </button>
        </div>

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
              <div className=" text-start relative group inline-block overflow-visible">
                <StatusBadge status={advance.advanceStatus} />
                
                                         {/* Tooltip */}
                                         <div
                      className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
               opacity-0 invisible group-hover:opacity-100 group-hover:visible
               transition-all duration-150 ease-out pointer-events-none
               bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap
               shadow-lg z-50"
                    >
                      dummy email : anilr5364@gmail.com
                    </div>
              </div>
            </div>
            <div className="mt-0 pt-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span className="text-gray-600 text-xs uppercase tracking-wide">
                  Total Amount
                </span>
                {maskAmounts ? (
                  <span className="blur-sm select-none text-gray-400">
                    ₹XX,XXX
                  </span>
                ) : (
                  <span className="font-medium">
                    {formatCurrency(advance.amount)}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-0 pt-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span className="text-gray-600 text-xs uppercase tracking-wide">
                  Deduction Amount
                </span>
                {maskAmounts ? (
                  <span className="blur-sm select-none text-gray-400">
                    ₹XX,XXX
                  </span>
                ) : (
                  <span className="font-medium">
                    {formatCurrency(advance.numberOfDeductions)}
                  </span>
                )}
              </div>
            </div>
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
      </div>

      {formattedData.length === 0 && (
        <div className="text-center py-12 px-4">
          <p className="text-gray-500">No advances found.</p>
        </div>
      )}
    </div>
  );

  return (
    <div>
      {isDesktop ? <DesktopLayout /> : <MobileLayout />}

      {/* Modal for Advance Form */}
      {showAdvanceForm && (
        <Modal onClose={handleCloseModal}>
          <AdvanceForm user={user} onClose={handleCloseModal} />
        </Modal>
      )}
    </div>
  );
};

export default AdvancesList;
