"use client";

import type React from "react";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";
import HeaderBar from "../../HeaderBar";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { StatusBadge } from "./StatusBadge";
import { UiAdvance } from "../../../types/employeeAttendance";
import { formatCurrency } from "../../../utils/currencyFormatter";

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
  const formatToIndianDate = (dateString?: string): string => {
    if (!dateString) return "N/A"; // show N/A if no value
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A"; // handle invalid date
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const DesktopLayout = () => (
    <div className="min-h-screen max-w-[100vw] overflow-x-hidden">
      <div className="flex items-center rounded-lg justify-between mb-4">
        <HeaderBar
          title={`Installments - ${advance.name}`}
          showBackButton={true}
          onBack={onBack}
          rightSlot={
            // CHANGED: Using .btn-secondary for consistent button styling.
            <button
              onClick={onToggleMask}
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
                  {/* CHANGED: Using brand 'primary' color from config */}
                  <BsToggleOn className="w-6 h-6 text-primary" />
                </>
              )}
            </button>
          }
        />
      </div>
      <div className="w-full max-w-[100vw] mx-auto py-0">
        <div className="mb-6 px-0">
          {/* CHANGED: Using new reusable .info-card class */}
          <div className="info-card mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-center">
              <div>
                <span className="text-gray-600">Total Amount:</span>
                <div className="font-semibold">
                  {maskAmounts ? <span className="blur-sm select-none">₹XX,XXX</span> : formatCurrency(advance.amount)}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Period:</span>
                <div className="font-semibold">{formatToIndianDate(advance.startDate)} to {formatToIndianDate(advance.endDate)}</div>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <div><StatusBadge status={advance.advanceStatus} /></div>
              </div>
              <div>
                <span className="text-gray-600">Total Installments:</span>
                <div className="font-semibold">{advance.installments.length}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-0">
          <div className="rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* CHANGED: Using .table-header */}
            <div className="table-header">
              <div className="grid grid-cols-5 gap-4">
                {/* CHANGED: Using .table-header-text on all header titles */}
                <div className="table-header-text text-center">Installment No.</div>
                <div className="table-header-text text-center">Date</div>
                <div className="table-header-text text-center">Opening Balance</div>
                <div className="table-header-text text-center">Installment Amount</div>
                <div className="table-header-text text-center">Principal Balance</div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {advance.installments.map((installment, index) => (
                // CHANGED: Using .data-row and grid layout. Children use .data-cell
                <div
                  key={`${installment.installmentNo}-${index}`}
                  className="data-row grid grid-cols-5 gap-4"
                >
                  <div className="data-cell text-center font-medium">#{installment.installmentNo}</div>
                  <div className="data-cell text-center">{formatToIndianDate(installment.installmentDate)}</div>
                  <div className="data-cell text-center">
                    {maskAmounts ? <span className="blur-sm select-none">₹XX,XXX</span> : <span className="font-medium">{formatCurrency(installment.openingBalance)}</span>}
                  </div>
                  <div className="data-cell text-center">
                    {maskAmounts ? <span className="blur-sm select-none">₹XX,XXX</span> : <span className="font-medium text-primary">{formatCurrency(installment.installmentAmount)}</span>}
                  </div>
                  <div className="data-cell text-center">
                    {maskAmounts ? <span className="blur-sm select-none">₹XX,XXX</span> : <span className={`font-medium ${installment.principalBalance === 0 ? "text-green-600" : ""}`}>{formatCurrency(installment.principalBalance)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // NOTE: Mobile layout is highly custom. We will apply standardization where possible.
  const MobileLayout = () => (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <HeaderBar
          title={`Installments - ${advance.name}`}
          showBackButton={true}
          onBack={onBack}
          rightSlot={
            <button onClick={onToggleMask} className="p-2" title={maskAmounts ? "Show amounts" : "Hide amounts"}>
              {maskAmounts ? <BsToggleOff className="w-6 h-6 text-gray-400" /> : <BsToggleOn className="w-6 h-6 text-primary" />}
            </button>
          }
        />
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 min-h-0">
        {/* CHANGED: Using reusable .info-card class */}
        <div className="info-card mx-4 mt-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Amount:</span>
              <div className="font-semibold">{maskAmounts ? <span className="blur-sm select-none">₹XX,XXX</span> : formatCurrency(advance.amount)}</div>
            </div>
            <div>
              <span className="text-gray-600">Period:</span>
              <div className="font-semibold">{formatToIndianDate(advance.startDate)} to {formatToIndianDate(advance.endDate)}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm mt-4">
            <div>
              <span className="text-gray-600 text-right">Total Installments</span>
              <div className="mt-1">{advance.installments.length}</div>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <div className="mt-1"><StatusBadge status={advance.advanceStatus} /></div>
            </div>
          </div>
        </div>

        <div className="mx-4 mt-4 mb-4">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* CHANGED: Using .table-header and .table-header-text */}
                <div className="table-header px-4">
                  <div className="grid grid-cols-5 gap-4">
                    <div className="table-header-text text-center">Installment No.</div>
                    <div className="table-header-text text-center">Date</div>
                    <div className="table-header-text text-center">Opening Balance</div>
                    <div className="table-header-text text-center">Installment Amount</div>
                    <div className="table-header-text text-center">Principal Balance</div>
                  </div>
                </div>

                <div className="divide-y divide-gray-200">
                  {advance.installments.map((installment, index) => (
                    <div key={`${installment.installmentNo}-${index}`} className="data-row grid grid-cols-5 gap-4 px-4 py-3 text-sm">
                      <div className="data-cell text-center font-medium flex items-center justify-center">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-semibold">#{installment.installmentNo}</span>
                      </div>
                      <div className="data-cell text-center flex items-center justify-center">{formatToIndianDate(installment.installmentDate)}</div>
                      <div className="data-cell text-center flex items-center justify-center">
                        {maskAmounts ? <span className="blur-sm select-none text-sm">₹XX,XXX</span> : <div className="text-sm font-medium leading-tight">{formatCurrency(installment.openingBalance)}</div>}
                      </div>
                      <div className="data-cell text-center flex items-center justify-center">
                        {maskAmounts ? <span className="blur-sm select-none text-sm">₹XX,XXX</span> : <div className="text-sm font-medium text-primary leading-tight">{formatCurrency(installment.installmentAmount)}</div>}
                      </div>
                      <div className="data-cell text-center flex items-center justify-center">
                        {maskAmounts ? <span className="blur-sm select-none text-sm">₹XX,XXX</span> : <div className={`text-sm font-medium leading-tight ${installment.principalBalance === 0 ? "text-green-600" : ""}`}>{formatCurrency(installment.principalBalance)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return <div>{isDesktop ? <DesktopLayout /> : <MobileLayout />}</div>;
};

export default InstallmentsList;
