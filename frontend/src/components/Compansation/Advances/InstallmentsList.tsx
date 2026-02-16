/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type React from "react";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";
import HeaderBar from "../../HeaderBar";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { UiAdvance } from "../../../types/employeeAttendance";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import CardTable from "../../shared/CardTable";
import Button from "../../shared/atoms/Button";
import { Card } from "../../shared/atoms/Card";
import StatusBadge from "../../shared/atoms/statusBadge";
import Tooltip from "../../shared/Tooltip";
import { Typography } from "../../shared/atoms/Typography";
import { formatCurrency } from "../../../utils/currency";

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
                <Button
                  bgColor="none"
                  onClick={onToggleMask}
                  className="whitespace-nowrap border border-gray-300"
                  data-tooltip={maskAmounts ? "Show amounts" : "Hide amounts"}
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
                      {/* CHANGED: Using brand 'primary' color from config */}
                      <BsToggleOn className="w-6 h-6 text-primary" />
                    </>
                  )}
                </Button>
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
                <Tooltip content={`Allocated to : ${advance.employee_name}`}>
                  <StatusBadge status={advance.advanceStatus} />
                </Tooltip>
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
          {advance.installments.map((installment: any, index: number) => (
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
          ))}
        </CardTable>
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
          }
        />
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 min-h-0">
        {/* CHANGED: Using reusable .my-info-card class */}
        <div className="my-info-card mx-4 mt-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
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
                  {advance.employee_name}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-4 mt-4 mb-4">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* CHANGED: Using .my-table-header and .my-table-header-text */}
                <div className="my-table-header px-4">
                  <div className="grid grid-cols-5 gap-4">
                    <div className="my-table-header-text text-center">
                      Installment No.
                    </div>
                    <div className="my-table-header-text text-center">Date</div>
                    <div className="my-table-header-text text-center">
                      Opening Balance
                    </div>
                    <div className="my-table-header-text text-center">
                      Installment Amount
                    </div>
                    <div className="my-table-header-text text-center">
                      Principal Balance
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-gray-200">
                  {advance.installments.map((installment, index) => (
                    <div
                      key={`${installment.installmentNo}-${index}`}
                      className="my-data-row grid grid-cols-5 gap-4 px-4 py-3 text-sm"
                    >
                      <div className="  text-center font-medium flex items-center justify-center">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-semibold">
                          #{installment.installmentNo}
                        </span>
                      </div>
                      <div className="  text-center flex items-center justify-center">
                        {formatToIndianDate(installment.installmentDate)}
                      </div>
                      <div className="  text-center flex items-center justify-center">
                        {maskAmounts ? (
                          <span className="blur-sm select-none text-sm">
                            {formatCurrency("XX,XXX")}
                          </span>
                        ) : (
                          <div className="text-sm font-medium leading-tight">
                            {formatCurrency(installment.openingBalance)}
                          </div>
                        )}
                      </div>
                      <div className="  text-center flex items-center justify-center">
                        {maskAmounts ? (
                          <span className="blur-sm select-none text-sm">
                            {formatCurrency("XX,XXX")}
                          </span>
                        ) : (
                          <div className="text-sm font-medium text-primary leading-tight">
                            {formatCurrency(installment.installmentAmount)}
                          </div>
                        )}
                      </div>
                      <div className="  text-center flex items-center justify-center">
                        {maskAmounts ? (
                          <span className="blur-sm select-none text-sm">
                            {formatCurrency("XX,XXX")}
                          </span>
                        ) : (
                          <div
                            className={`text-sm font-medium leading-tight ${installment.principalBalance === 0
                              ? "text-green-600"
                              : ""
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

  return <>{isDesktop ? <DesktopLayout /> : <MobileLayout />}</>;
};

export default InstallmentsList;
