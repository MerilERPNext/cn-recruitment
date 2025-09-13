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

  const DesktopLayout = () => (
    <div className="min-h-screen max-w-[100vw] overflow-x-hidden">
      <div className="w-full max-w-[100vw] mx-auto py-0">
        {/* Header with toggle */}
        <div className="mb-6 px-0">
          <div className="flex items-center justify-between mb-4">
            <HeaderBar
              title={`Installments - ${advance.name}`}
              showBackButton={true}
              onBack={onBack}
              rightSlot={
                <button
                  onClick={onToggleMask}
                  className="flex items-center gap-2 whitespace-nowrap border border-gray-300 rounded-lg px-4 py-2 bg-white hover:bg-gray-50 transition-colors duration-200"
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
                      <BsToggleOn className="w-6 h-6 text-blue-500" />
                    </>
                  )}
                </button>
              }
            />
          </div>

          {/* Advance Summary Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-center">
              <div>
                <span className="text-gray-600">Total Amount:</span>
                <div className="font-semibold">
                  {maskAmounts ? (
                    <span className="blur-sm select-none">₹XX,XXX</span>
                  ) : (
                    formatCurrency(advance.amount)
                  )}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Period:</span>
                <div className="font-semibold">
                  {advance.startDate} to {advance.endDate}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <div>
                  <StatusBadge status={advance.advanceStatus} />
                </div>
              </div>
              <div>
                <span className="text-gray-600">Total Installments:</span>
                <div className="font-semibold">
                  {advance.installments.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="px-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-5 gap-4 px-6 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                <div className="text-center">Installment No.</div>
                <div className="text-center">Date</div>
                <div className="text-center">Opening Balance</div>
                <div className="text-center">Installment Amount</div>
                <div className="text-center">Principal Balance</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {advance.installments.map((installment, index) => (
                <div
                  key={`${installment.installmentNo}-${index}`}
                  className="grid grid-cols-5 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="text-center font-medium text-gray-900">
                    #{installment.installmentNo}
                  </div>

                  <div className="text-center text-gray-700">
                    {installment.installmentDate}
                  </div>

                  <div className="text-center">
                    {maskAmounts ? (
                      <span className="blur-sm select-none text-gray-400">
                        ₹XX,XXX
                      </span>
                    ) : (
                      <span className="font-medium">
                        {formatCurrency(installment.openingBalance)}
                      </span>
                    )}
                  </div>

                  <div className="text-center">
                    {maskAmounts ? (
                      <span className="blur-sm select-none text-gray-400">
                        ₹XX,XXX
                      </span>
                    ) : (
                      <span className="font-medium text-blue-600">
                        {formatCurrency(installment.installmentAmount)}
                      </span>
                    )}
                  </div>

                  <div className="text-center">
                    {maskAmounts ? (
                      <span className="blur-sm select-none text-gray-400">
                        ₹XX,XXX
                      </span>
                    ) : (
                      <span
                        className={`font-medium ${
                          installment.principalBalance === 0
                            ? "text-green-600"
                            : "text-gray-900"
                        }`}
                      >
                        {formatCurrency(installment.principalBalance)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const MobileLayout = () => (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Full-screen header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <HeaderBar
          title={`Installments - ${advance.name}`}
          showBackButton={true}
          onBack={onBack}
          rightSlot={
            <button
              onClick={onToggleMask}
              className="p-2"
              title={maskAmounts ? "Show amounts" : "Hide amounts"}
            >
              {maskAmounts ? (
                <BsToggleOff className="w-6 h-6 text-gray-400" />
              ) : (
                <BsToggleOn className="w-6 h-6 text-blue-500" />
              )}
            </button>
          }
        />
      </div>

      {/* Scrollable content with proper height calculation */}
      <div className="flex-1 overflow-y-auto bg-gray-50 min-h-0">
        {/* Advance Summary Card */}
        <div className="mx-4 mt-4 rounded-lg bg-blue-50 border border-blue-200 mb-6 p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Amount:</span>
              <div className="font-semibold">
                {maskAmounts ? (
                  <span className="blur-sm select-none">₹XX,XXX</span>
                ) : (
                  formatCurrency(advance.amount)
                )}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Period:</span>
              <div className="font-semibold">
                {advance.startDate} to {advance.endDate}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm mt-4">
            <div>
              <span className="text-gray-600 text-right">
                Total Installments
              </span>
              <div className="mt-1">{advance.installments.length}</div>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <div className="mt-1">
                <StatusBadge status={advance.advanceStatus} />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Table View with horizontal scroll */}
        <div className="mx-4 mt-4 mb-4">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Horizontal scrolling container */}
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Table Header */}
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                  <div className="grid grid-cols-5 gap-4 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    <div className="text-center">Installment No.</div>
                    <div className="text-center">Date</div>
                    <div className="text-center">Opening Balance</div>
                    <div className="text-center">Installment Amount</div>
                    <div className="text-center">Principal Balance</div>
                  </div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-gray-200">
                  {advance.installments.map((installment, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-5 gap-4 px-4 py-3 text-sm"
                    >
                      {/* Installment Number */}
                      <div className="text-center font-medium text-gray-900 flex items-center justify-center">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-semibold">
                          #{installment.installmentNo}
                        </span>
                      </div>

                      {/* Date */}
                      <div className="text-center text-gray-700 flex items-center justify-center">
                        <div className="text-sm leading-tight">
                          {installment.installmentDate}
                        </div>
                      </div>

                      {/* Opening Balance - Full Amount */}
                      <div className="text-center flex items-center justify-center">
                        {maskAmounts ? (
                          <span className="blur-sm select-none text-gray-400 text-sm">
                            ₹XX,XXX
                          </span>
                        ) : (
                          <div className="text-sm font-medium text-gray-900 leading-tight">
                            {formatCurrency(installment.openingBalance)}
                          </div>
                        )}
                      </div>

                      {/* Installment Amount - Full Amount */}
                      <div className="text-center flex items-center justify-center">
                        {maskAmounts ? (
                          <span className="blur-sm select-none text-gray-400 text-sm">
                            ₹XX,XXX
                          </span>
                        ) : (
                          <div className="text-sm font-medium text-blue-600 leading-tight">
                            {formatCurrency(installment.installmentAmount)}
                          </div>
                        )}
                      </div>

                      {/* Principal Balance - Full Amount, no "✓ Paid" shorthand */}
                      <div className="text-center flex items-center justify-center">
                        {maskAmounts ? (
                          <span className="blur-sm select-none text-gray-400 text-sm">
                            ₹XX,XXX
                          </span>
                        ) : (
                          <div
                            className={`text-sm font-medium leading-tight ${
                              installment.principalBalance === 0
                                ? "text-green-600"
                                : "text-gray-900"
                            }`}
                          >
                            {formatCurrency(installment.principalBalance)}
                          </div>
                        )}
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
