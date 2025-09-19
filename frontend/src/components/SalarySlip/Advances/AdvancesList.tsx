"use client";
import type React from "react";
import { useState } from "react";
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
import Modal from "./commonModal"
import formatToIndianDate from "../../../utils/formatToIndianDate";


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
  const { data: advancesData } = useEmployeeAdvances(employeeId || "");

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
            {/* CHANGED: Using .btn-secondary */}
            <button
              onClick={() => setMaskAmounts(!maskAmounts)}
              className="btn-secondary"
              title={maskAmounts ? "Show amounts" : "Hide amounts"}
            >
              {maskAmounts ? (
                <>
                  <span className="text-sm font-medium text-gray-700">Show Amounts</span>
                  <BsToggleOff className="w-6 h-6 text-gray-400" />
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-gray-700">Hide Amounts</span>
                  <BsToggleOn className="w-6 h-6 text-primary" /> {/* CHANGED: Using brand color */}
                </>
              )}
            </button>
            {/* CHANGED: Using .btn-primary */}
            <button
              onClick={handleCreateAdvance}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              Create Advance
            </button>
          </div>
        </div>

        <div className="px-0">
          <div className="rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* CHANGED: Using .table-header */}
            <div className="table-header">
              <div className="grid grid-cols-6 gap-4">
                {/* CHANGED: Using .table-header-text on all header titles */}
                <div className="table-header-text">Advance Name</div>
                <div className="table-header-text text-center">Amount</div>
                <div className="table-header-text text-center">Deductions</div>
                <div className="table-header-text text-center">Start Date</div>
                <div className="table-header-text text-center">End Date</div>
                <div className="table-header-text text-center">Status</div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {formattedData.map((advance, index) => (
                // CHANGED: Using .table-row and grid layout. Children use .data-cell
                <div
                  key={`${advance.name}-${index}`}
                  className="data-row grid grid-cols-6 gap-4 cursor-pointer"
                  onClick={() => handleViewInstallments(advance)}
                >
                  <div className="data-cell font-medium">
                    {advance.name}
                  </div>
                  <div className="data-cell text-center">
                    {maskAmounts ? (
                      <span className="blur-sm select-none text-gray-400">₹XX,XXX</span>
                    ) : (
                      <span className="font-medium">{formatCurrency(advance.amount)}</span>
                    )}
                  </div>
                  <div className="data-cell text-center">
                    {maskAmounts ? (
                      <span className="blur-sm select-none text-gray-400">₹XX,XXX</span>
                    ) : (
                      <span className="font-medium">{advance.numberOfDeductions}</span>
                    )}
                  </div>
                  <div className="data-cell text-center">{formatToIndianDate(advance.startDate)}</div>
                  <div className="data-cell text-center">{formatToIndianDate(advance.endDate)}</div>
                  <div className="data-cell text-center">
                    <StatusBadge status={advance.advanceStatus} />
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
          {/* CHANGED: Using .btn-secondary */}
          <button
            onClick={() => setMaskAmounts(!maskAmounts)}
            className="btn-secondary"
            title={maskAmounts ? "Show amounts" : "Hide amounts"}
          >
             {maskAmounts ? (
                <>
                  <span className="text-sm font-medium text-gray-700">Show Amounts</span>
                  <BsToggleOff className="w-6 h-6 text-gray-400" />
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-gray-700">Hide Amounts</span>
                  <BsToggleOn className="w-6 h-6 text-primary" /> {/* CHANGED: Using brand color */}
                </>
              )}
          </button>
          {/* CHANGED: Using .btn-primary */}
          <button
            onClick={handleCreateAdvance}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            Create Advance
          </button>
        </div>

        {formattedData.map((advance, index) => (
          // CHANGED: Using .content-card for a consistent card style
          <div
            key={`${advance.name}-${index}`}
            className="content-card cursor-pointer"
            onClick={() => handleViewInstallments(advance)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{advance.name}</h3>
              </div>
              <StatusBadge status={advance.advanceStatus} />
            </div>
            <div className="mt-0 pt-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span className="text-gray-600 text-xs uppercase tracking-wide">Total Amount</span>
                {maskAmounts ? (
                  <span className="blur-sm select-none text-gray-400">₹XX,XXX</span>
                ) : (
                  <span className="font-medium">{formatCurrency(advance.amount)}</span>
                )}
              </div>
            </div>
            <div className="mt-0 pt-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span className="text-gray-600 text-xs uppercase tracking-wide">Deduction Amount</span>
                {maskAmounts ? (
                  <span className="blur-sm select-none text-gray-400">₹XX,XXX</span>
                ) : (
                  <span className="font-medium">{formatCurrency(advance.numberOfDeductions)}</span>
                )}
              </div>
            </div>
            <div className="mt-0 pt-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>
                  <strong>{formatToIndianDate(advance.startDate)}</strong> to <strong>{formatToIndianDate(advance.endDate)}</strong>
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