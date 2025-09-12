"use client";

import type React from "react";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";
import HeaderBar from "../../HeaderBar";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { StatusBadge } from "./StatusBadge";

interface Installment {
  installmentNo: number;
  installmentDate: string;
  openingBalance: number;
  installmentAmount: number;
  principalBalance: number;
}

interface Advance {
  name: string;
  amount: number;
  numberOfDeductions: number;
  startDate: string;
  endDate: string;
  advanceStatus: string;
  installments: Installment[];
}

interface InstallmentsListProps {
  advance: Advance;
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
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

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
                  key={index}
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
    <div className="min-h-screen w-full bg-gray-50">
      {/* Header */}
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

      {/* Advance Summary Card */}
      <div className="bg-white mx-4 mt-4 rounded-lg border border-gray-200 p-4">
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
            <span className="text-gray-600">Status:</span>
            <div className="mt-1">
              <StatusBadge status={advance.advanceStatus} />
            </div>
          </div>
          <div className="col-span-2">
            <span className="text-gray-600">Period:</span>
            {" "}
            <span className="font-semibold">
              {advance.startDate} to {advance.endDate}
            </span>
          </div>
        </div>
      </div>

      {/* All Installments List */}
      <div className="p-4 space-y-3">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          All Installments ({advance.installments.length})
        </h3>

        {advance.installments.map((installment, index) => (
          <div
            key={index}
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-lg font-semibold text-gray-900">
                #{installment.installmentNo}
              </h4>
              <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                {installment.installmentDate}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="bg-blue-50 rounded-lg p-3">
                <span className="text-blue-700 text-xs uppercase tracking-wide font-medium">
                  Opening Balance
                </span>
                <div className="mt-1">
                  {maskAmounts ? (
                    <span className="blur-sm select-none text-gray-400 text-lg font-semibold">
                      ₹XX,XXX
                    </span>
                  ) : (
                    <span className="text-lg font-semibold text-gray-900">
                      {formatCurrency(installment.openingBalance)}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-3">
                <span className="text-green-700 text-xs uppercase tracking-wide font-medium">
                  Installment Amount
                </span>
                <div className="mt-1">
                  {maskAmounts ? (
                    <span className="blur-sm select-none text-gray-400 text-lg font-semibold">
                      ₹XX,XXX
                    </span>
                  ) : (
                    <span className="text-lg font-semibold text-green-600">
                      {formatCurrency(installment.installmentAmount)}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-gray-700 text-xs uppercase tracking-wide font-medium">
                  Principal Balance
                </span>
                <div className="mt-1">
                  {maskAmounts ? (
                    <span className="blur-sm select-none text-gray-400 text-lg font-semibold">
                      ₹XX,XXX
                    </span>
                  ) : (
                    <span
                      className={`text-lg font-semibold ${
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
            </div>

            {installment.principalBalance === 0 && (
              <div className="mt-3 text-center">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ✓ Completed
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return <div>{isDesktop ? <DesktopLayout /> : <MobileLayout />}</div>;
};

export default InstallmentsList;
