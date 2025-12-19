"use client";
import type React from "react";
import { useEffect, useState } from "react";
import { Form } from "@tsed/react-formio";
import {
  useGetLeavePassbookMetadata,
  useGetLeavePassbookTransaction,
} from "../../../../hooks/useLeaves";
import { LeaveBalance } from "../../../../types/leaves";
import { useCurrentEmployee } from "../../../../hooks/useEmployee";

interface PassbookTabProps {
  leaveData: LeaveBalance;
}

const PassbookTab: React.FC<PassbookTabProps> = ({ leaveData }) => {
  const {
    data: currentEmployee,
    isLoading: isEmployeeLoading,
    isError: isEmployeeError,
  } = useCurrentEmployee();
  const employeeId = currentEmployee?.name;
  const leaveType = leaveData?.type || "";

  const [selectedCycle, setSelectedCycle] = useState<string>("");

  const {
    data: metadata,
    isLoading: isMetadataLoading,
    isError: isMetadataError,
  } = useGetLeavePassbookMetadata(employeeId ?? "", leaveType);

  const {
    data: transactions,
    isLoading: isTransactionsLoading,
    isError: isTransactionsError,
  } = useGetLeavePassbookTransaction(
    employeeId ?? "",
    leaveType,
    selectedCycle
  );

  useEffect(() => {
    if (!metadata?.default_cycle) return;
    setSelectedCycle(metadata.default_cycle);
  }, [metadata]);

  const cycleSelectForm = {
    display: "form",
    components: [
      {
        type: "select",
        key: "cycleStarts",
        label: "Cycle Starts",
        placeholder: isMetadataLoading ? "Loading cycles..." : "Select cycle",
        input: true,
        dataSrc: "values",
        data: {
          values:
            metadata?.cycle_options?.map((c) => ({
              label: c.label,
              value: c.value,
            })) || [],
        },
        validate: { required: false },
        disabled: isMetadataLoading,
      },
    ],
  };

  const handleCycleChange = (submission: {
    data?: { cycleStarts?: string };
  }) => {
    const cycle = submission?.data?.cycleStarts;
    setSelectedCycle(cycle || "");
  };

  const formatDateTime = (dateTime: string) => {
    if (!dateTime) return null;
    const [date, time] = dateTime.split(" ");
    return (
      <div className="flex flex-col">
        <span className="font-medium">{date}</span>
        <span className="text-xs text-gray-500">{time}</span>
      </div>
    );
  };

  const formatDateRange = (fromDate: string, toDate: string) => {
    if (!fromDate || !toDate) return "";
    const f = (d: string) => d.split("-").reverse().join("-");
    return `From: ${f(fromDate)} To: ${f(toDate)}`;
  };

  const LoadingSkeleton = () => (
    <div className="p-4 space-y-4">
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div className="w-full md:w-1/2">
          <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse" />
          <div className="h-6 bg-gray-200 rounded w-64 animate-pulse" />
        </div>
        <div className="w-full md:w-64">
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-100 border-b border-gray-200 p-4">
          <div className="flex gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-4 bg-gray-300 rounded flex-1 animate-pulse"
              />
            ))}
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <div key={rowIndex} className="p-4 flex gap-4">
              {Array.from({ length: 5 }).map((_, colIndex) => (
                <div
                  key={colIndex}
                  className="h-4 bg-gray-200 rounded flex-1 animate-pulse"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (isEmployeeLoading) {
    return <LoadingSkeleton />;
  }

  if (isEmployeeError || !employeeId) {
    return (
      <div className="p-4 text-sm text-red-600">
        Failed to load employee information
      </div>
    );
  }

  if (isMetadataError) {
    return (
      <div className="p-4 text-sm text-red-600">
        Failed to load passbook metadata
      </div>
    );
  }

  if (isMetadataLoading) {
    return <LoadingSkeleton />;
  }

  if (!metadata?.cycle_options || metadata.cycle_options.length === 0) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <svg
            className="w-16 h-16 mb-4 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-base font-medium text-gray-700">
            No passbook data available
          </p>
          <p className="text-sm text-gray-500 mt-2">
            There are no cycles available for {leaveType}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-col md:flex-row items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-1">
            Transaction
          </h3>
          {selectedCycle ? (
            <p className="text-base font-semibold">
              {formatDateRange(
                metadata?.transaction_range?.from_date || "",

                metadata?.transaction_range?.to_date || ""
              )}
            </p>
          ) : (
            <span className="text-xs text-gray-400 italic">
              No cycle selected!
            </span>
          )}
        </div>

        <div className={`w-full md:w-64 ${!selectedCycle ? "md:ml-auto" : ""}`}>
          <Form
            key={selectedCycle || "empty"}
            form={cycleSelectForm}
            submission={{ data: { cycleStarts: selectedCycle } }}
            options={{ noAlerts: true }}
            onChange={handleCycleChange}
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Time
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Comment
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">
                Opening Balance
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">
                Transacted Balance
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">
                Closing Balance
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {!selectedCycle ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <svg
                      className="w-12 h-12 mb-3 text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-sm font-medium">
                      No leave balance data available for the selected date.
                    </p>
                    <p className="text-xs mt-1">
                      Please select a cycle from the dropdown above
                    </p>
                  </div>
                </td>
              </tr>
            ) : isTransactionsError ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-red-600">
                  Failed to load transactions
                </td>
              </tr>
            ) : isTransactionsLoading ? (
              <>
                {[1, 2, 3, 4, 5].map((row) => (
                  <tr key={row}>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                        <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-12 mx-auto animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-12 mx-auto animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-12 mx-auto animate-pulse" />
                    </td>
                  </tr>
                ))}
              </>
            ) : transactions?.entries?.length ? (
              transactions.entries.map((t, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDateTime(t.time)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700 max-w-md">{t.comment}</p>
                  </td>
                  <td className="px-4 py-3 text-center font-medium">
                    {t.opening_balance}
                  </td>
                  <td className="px-4 py-3 text-center font-medium">
                    {t.transacted_balance}
                  </td>
                  <td className="px-4 py-3 text-center font-medium">
                    {t.closing_balance ?? "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No transactions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PassbookTab;
