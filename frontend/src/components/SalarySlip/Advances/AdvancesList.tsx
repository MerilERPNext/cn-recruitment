"use client";

import type React from "react";
import { useState } from "react";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";
import InstallmentsList from "./InstallmentsList";
import { StatusBadge } from "./StatusBadge";
import { useScreenSize } from "../../../hooks/useScreenSize";

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

interface AdvancesData {
  advances: Advance[];
}

const AdvancesList: React.FC = () => {
  const [maskAmounts, setMaskAmounts] = useState(true);
  const [selectedAdvance, setSelectedAdvance] = useState<Advance | null>(null);
  const [showInstallments, setShowInstallments] = useState(false);
  const { isDesktop } = useScreenSize();

  const mockData: AdvancesData = {
    advances: [
      {
        name: "Salary Advance",
        amount: 50000,
        numberOfDeductions: 30000,
        startDate: "01-09-2025",
        endDate: "31-12-2025",
        advanceStatus: "Pending Approval",
        installments: [
          {
            installmentNo: 1,
            installmentDate: "30-09-2025",
            openingBalance: 50000,
            installmentAmount: 25000,
            principalBalance: 25000,
          },
          {
            installmentNo: 2,
            installmentDate: "10-11-2025",
            openingBalance: 25000,
            installmentAmount: 25000,
            principalBalance: 0,
          },
        ],
      },
      {
        name: "Festival Advance",
        amount: 20000,
        numberOfDeductions: 20000,
        startDate: "15-08-2025",
        endDate: "15-10-2025",
        advanceStatus: "Approved",
        installments: [
          {
            installmentNo: 1,
            installmentDate: "15-09-2025",
            openingBalance: 20000,
            installmentAmount: 10000,
            principalBalance: 10000,
          },
          {
            installmentNo: 2,
            installmentDate: "15-10-2025",
            openingBalance: 10000,
            installmentAmount: 10000,
            principalBalance: 0,
          },
        ],
      },
      {
        name: "Medical Advance",
        amount: 75000,
        numberOfDeductions: 25000,
        startDate: "01-07-2025",
        endDate: "01-01-2026",
        advanceStatus: "Ongoing",
        installments: [
          {
            installmentNo: 1,
            installmentDate: "01-08-2025",
            openingBalance: 75000,
            installmentAmount: 15000,
            principalBalance: 60000,
          },
          {
            installmentNo: 2,
            installmentDate: "01-09-2025",
            openingBalance: 60000,
            installmentAmount: 15000,
            principalBalance: 45000,
          },
        ],
      },
      {
        name: "Education Advance",
        amount: 100000,
        numberOfDeductions: 60000,
        startDate: "01-06-2024",
        endDate: "01-06-2025",
        advanceStatus: "Completed",
        installments: [
          {
            installmentNo: 1,
            installmentDate: "01-07-2024",
            openingBalance: 100000,
            installmentAmount: 20000,
            principalBalance: 80000,
          },
        ],
      },
    ],
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleViewInstallments = (advance: Advance) => {
    setSelectedAdvance(advance);
    setShowInstallments(true);
  };

  const handleBackToAdvances = () => {
    setShowInstallments(false);
    setSelectedAdvance(null);
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
            <button
              onClick={() => setMaskAmounts(!maskAmounts)}
              className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 bg-white hover:bg-gray-50 transition-colors duration-200 whitespace-nowrap"
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
          </div>
        </div>

        <div className="px-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-6 gap-4 px-6 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                <div>Advance Name</div>
                <div className="text-center">Amount</div>
                <div className="text-center">Deductions</div>
                <div className="text-center">Start Date</div>
                <div className="text-center">End Date</div>
                <div className="text-center">Status</div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {mockData.advances.map((advance, index) => (
                <div
                  key={index}
                  className="grid grid-cols-6 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                  onClick={() => handleViewInstallments(advance)}
                >
                  <div className="font-medium text-gray-900">
                    {advance.name}
                  </div>

                  <div className="text-center">
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

                  <div className="text-center">
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

                  <div className="text-center text-gray-700">
                    {advance.startDate}
                  </div>
                  <div className="text-center text-gray-700">
                    {advance.endDate}
                  </div>

                  <div className="text-center">
                    <StatusBadge status={advance.advanceStatus} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {mockData.advances.length === 0 && (
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
        <div className="flex items-center justify-end gap-4">
          <button
            onClick={() => setMaskAmounts(!maskAmounts)}
            className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 bg-white hover:bg-gray-50 transition-colors duration-200 whitespace-nowrap"
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
        </div>
        {mockData.advances.map((advance, index) => (
          <div
            key={index}
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
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

            <div className="flex justify-between text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-gray-600 text-xs uppercase tracking-wide">
                  Amount
                </span>
                <div className="mt-1">
                  {maskAmounts ? (
                    <span className="blur-sm select-none text-gray-400 font-medium">
                      ₹XX,XXX
                    </span>
                  ) : (
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(advance.amount)}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-gray-600 text-xs uppercase tracking-wide">
                  Deductions
                </span>
                <div className="mt-1">
                  {maskAmounts ? (
                    <span className="blur-sm select-none text-gray-400 font-medium">
                      ₹XX,XXX
                    </span>
                  ) : (
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(advance.numberOfDeductions)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-0 pt-3 border-t border-gray-100">
              <div className="flex justify-between text-sm text-gray-600">
                <span>
                  <strong>{advance.startDate}</strong> to <strong>{advance.endDate}</strong>
                </span>
                <span>{advance.installments.length} installments</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {mockData.advances.length === 0 && (
        <div className="text-center py-12 px-4">
          <p className="text-gray-500">No advances found.</p>
        </div>
      )}
    </div>
  );

  return <div>{isDesktop ? <DesktopLayout /> : <MobileLayout />}</div>;
};

export default AdvancesList;
