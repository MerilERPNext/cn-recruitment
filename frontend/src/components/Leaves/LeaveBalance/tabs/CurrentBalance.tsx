"use client";
import type React from "react";
import { useState } from "react";
import { Form } from "@tsed/react-formio";
import { useGetLeaveBalance } from "../../../../hooks/useLeaves";
import { useCurrentEmployee } from "../../../../hooks/useEmployee";
import { LeaveBalance } from "../../../../types/leaves";
import { Typography } from "../../../shared/atoms/Typography";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
interface CurrentBalanceTabProps {
  leaveData: LeaveBalance;
}

const CurrentBalanceTab: React.FC<CurrentBalanceTabProps> = ({ leaveData }) => {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [isMoreDetailsOpen, setIsMoreDetailsOpen] = useState(false);



  const {
    data: currentEmployee,
    isLoading: isEmployeeLoading,
    isError: isEmployeeError,
  } = useCurrentEmployee();

  const leaveId = leaveData?.leave_id || "";

  const {
    data: balanceData,
    isLoading: isBalanceLoading,
    isError: isBalanceError,
  } = useGetLeaveBalance(currentEmployee?.name, selectedDate, leaveId);

  const displayData = balanceData?.leave_balance?.[0];

  const datePickerForm = {
    display: "form",
    components: [
      {
        type: "datetime",
        key: "selectedDate",
        label: "Select Date",
        input: true,
        format: "dd-MM-yyyy",
        enableDate: true,
        enableTime: false,
        defaultValue: today,
        customClass: "font-medium",
        widget: {
          type: "calendar",
          displayInTimezone: "viewer",
          language: "en",
          useLocaleSettings: false,
          allowInput: true,
          mode: "single",
          enableTime: false,
          noCalendar: false,
          format: "dd-MM-yyyy",
          hourIncrement: 1,
          minuteIncrement: 1,
          time_24hr: false,
          minDate: null,
          disableWeekends: false,
          disableWeekdays: false,
          maxDate: null,
        },
        customOptions: {
          minDate: today,
        },
        datePicker: {
          minDate: today,
        },
        validate: {
          required: true,
          customMessage: "Please select a date",
        },
        disabled: isEmployeeLoading,
      },
    ],
  };

  const handleDateChange = (submission: {
    data?: { selectedDate?: string };
  }) => {
    const dateStr = submission?.data?.selectedDate;
    if (dateStr) {
      setSelectedDate(dateStr.split("T")[0]);
    }
  };

  const toggleMoreDetails = () => {
    setIsMoreDetailsOpen((prev) => !prev);
  };

  const isLoading = isEmployeeLoading || isBalanceLoading;

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      <div className="mb-6 w-full md:w-80 lg:w-96">
        <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse" />
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
      </div>

      <div className="bg-blue-50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="h-5 bg-blue-200 rounded w-48 animate-pulse" />
          <div className="h-8 bg-blue-200 rounded w-16 animate-pulse" />
        </div>
      </div>

      <div className="border-b border-gray-200 py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-5 bg-gray-200 rounded w-48 mb-2 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
          </div>
          <div className="h-6 bg-gray-200 rounded w-12 animate-pulse" />
        </div>
      </div>

      <div className="py-4">
        <div className="flex items-center justify-between">
          <div className="h-5 bg-gray-200 rounded w-40 animate-pulse" />
          <div className="h-6 bg-gray-200 rounded w-12 animate-pulse" />
        </div>
      </div>

      <div className="border-t border-gray-200 py-4">
        <div className="flex items-center justify-between">
          <div className="h-5 bg-gray-200 rounded w-28 animate-pulse" />
          <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      <div className="mt-4">
        <div className="h-3 bg-gray-200 rounded w-full animate-pulse" />
        <div className="h-3 bg-gray-200 rounded w-3/4 mt-1 animate-pulse" />
      </div>
    </div>
  );

  if (isEmployeeError || (!isEmployeeLoading && !currentEmployee?.name)) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Error Loading Employee Data
              </h3>
              <p className="mt-1 text-sm text-red-700">
                Unable to fetch employee information. Please try again.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isBalanceError) {
    return (
      <div className="p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Error Loading Leave Balance
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                Unable to fetch leave balance. Please try again.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <>
          <div className="mb-6 w-full md:w-80 lg:w-96">
            <Form
              key={selectedDate}
              form={datePickerForm}
              submission={{ data: { selectedDate } }}
              options={{ noAlerts: true }}
              onChange={handleDateChange}
            />
          </div>

          {displayData ? (
            <>
              <div className="bg-primary/10 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <Typography className="font-medium">
                    Balance as of {formatToIndianDate(selectedDate)}
                  </Typography>
                  <span className="text-lg font-bold text-gray-900">
                    {displayData.balance ?? 0}
                  </span>
                </div>
              </div>

              <div className="border-b border-gray-200 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="base-title md:module-title md:font-medium mb-1">
                      Accrued So Far This Year
                    </h4>
                    <p className="text-sm font-normal text-gray-600">
                      Annual Allotment: {displayData.entitled ?? 0}
                    </p>
                  </div>
                  <span className="text-base md:text-lg font-bold text-success">
                    +{displayData.entitled ?? 0}
                  </span>
                </div>
              </div>

              <div className="py-4">
                <div className="flex items-center justify-between">
                  <h4 className="base-title md:module-title md:font-medium mb-1">
                    Credited From Last Year
                  </h4>
                  <span className="text-base md:text-lg font-bold text-gray-900">
                    {displayData.carry_over ?? 0}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-200 py-4">
                <button
                  type="button"
                  onClick={toggleMoreDetails}
                  className="w-full flex items-center justify-between text-gray-900 font-medium hover:text-gray-700 transition-colors"
                  aria-label="Toggle more details"
                  aria-expanded={isMoreDetailsOpen}
                >
                  <span>More Details</span>
                  <svg
                    className={`w-5 h-5 transition-transform duration-300 ${isMoreDetailsOpen ? "rotate-180" : ""
                      }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${isMoreDetailsOpen
                    ? "max-h-96 opacity-100 mt-4"
                    : "max-h-0 opacity-0"
                    }`}
                >
                  {displayData?.balance_excluding_future_transactions && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-600">
                          Balance Excluding Future Transactions
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {displayData.balance_excluding_future_transactions}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 text-xs text-gray-500 italic">
                *There could be a mismatch in the totals on this page, as a few
                data points have been disabled due to admin configurations.
              </div>
            </>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <p className="text-gray-600">
                No leave balance data available for the selected date.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CurrentBalanceTab;
