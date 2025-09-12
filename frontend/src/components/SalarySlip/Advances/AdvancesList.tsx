"use client";

import type React from "react";
import { useState } from "react";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";
import InstallmentsList from "./InstallmentsList";
import { StatusBadge } from "./StatusBadge";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { ApiAdvance, UiAdvance } from "../../../types/employeeAttendance";
import { useEmployeeAdvances } from "../../../hooks/useEmployeeAdvances";
import { formatCurrency } from "../../../utils/currencyFormatter";
import parseISO from "date-fns/parseISO";
import { format } from "date-fns";

const AdvancesList: React.FC = () => {
  const [maskAmounts, setMaskAmounts] = useState(true);
  const [selectedAdvance, setSelectedAdvance] = useState<UiAdvance | null>(
    null
  );
  const [showInstallments, setShowInstallments] = useState(false);
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
              {formattedData.map((advance, index) => (
                <div
                  key={`${advance.name}-${index}`}
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
                    {format(parseISO(advance.startDate), 'dd/MM/yyyy')}
                  </div>
                  <div className="text-center text-gray-700">
                    {format(parseISO(advance.endDate), 'dd/MM/yyyy')}
                  </div>

                  <div className="text-center">
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
        {formattedData.map((advance, index) => (
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
                  <strong>{format(parseISO(advance.startDate), 'dd/MM/yyyy')}</strong> to{" "}
                  <strong>{format(parseISO(advance.endDate), 'dd/MM/yyyy')}</strong>
                  
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

  return <div>{isDesktop ? <DesktopLayout /> : <MobileLayout />}</div>;
};

export default AdvancesList;
