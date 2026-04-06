"use client";
import React from "react";
import { useEffect, useMemo } from "react";
import { Form } from "@tsed/react-formio";
import { HelpCircle, Calendar } from "lucide-react";
import { NoDataFound } from "../../../shared/atoms/NoDataFound";
import {
  useGetAccrualJournalMetadata,
  useGetAccrualJournalEntries,
} from "../../../../hooks/useLeaves";
import { LeaveBalance } from "../../../../types/leaves";
import { useCurrentEmployee } from "../../../../hooks/useEmployee";

interface AccrualJournalTabProps {
  leaveData: LeaveBalance;
}

const AccrualJournalTab: React.FC<AccrualJournalTabProps> = ({ leaveData }) => {
  const {
    data: currentEmployee,
    isLoading: isEmployeeLoading,
    isError: isEmployeeError,
  } = useCurrentEmployee();
  const employeeId = currentEmployee?.name;
  const leaveType = leaveData?.type || "";
  const leaveId = leaveData?.leave_id || "";


  const [selectedPeriod, setSelectedPeriod] = React.useState<number | null>(
    null
  );

  const {
    data: metadata,
    isLoading: isMetadataLoading,
    isError: isMetadataError,
  } = useGetAccrualJournalMetadata(employeeId ?? "", leaveId);

  const {
    data: accrualEntries,
    isLoading: isEntriesLoading,
    isError: isEntriesError,
  } = useGetAccrualJournalEntries(employeeId ?? "", leaveId, selectedPeriod);

  const formioValues = useMemo(() => {
    if (!metadata?.period_options) return [];

    return metadata.period_options.map((p) => ({
      label: p.label,
      value: p.value,
      disabled: p.is_excluded === 1,
    }));
  }, [metadata]);

  const accrualPeriodForm = useMemo(
    () => ({
      display: "form",
      components: [
        {
          type: "select",
          key: "accrual_period",
          label: "Accrual Period",
          placeholder: isMetadataLoading
            ? "Loading periods..."
            : "Select accrual period",
          input: true,
          dataSrc: "values",
          data: {
            values: formioValues,
          },
          valueProperty: "value",
          template: "<span>{{ item.label }}</span>",
          clearOnHide: false,
          searchEnabled: false,
          validate: {
            required: false,
          },
          disabled: isMetadataLoading,
        },
      ],
    }),
    [formioValues, isMetadataLoading]
  );

  useEffect(() => {
    if (metadata?.default_period && selectedPeriod === null) {
      setSelectedPeriod(metadata.default_period);
    }
  }, [metadata, selectedPeriod]);

  const handlePeriodChange = (submission: {
    data?: { accrual_period?: number };
  }) => {
    const period = submission?.data?.accrual_period;
    if (period !== undefined) {
      setSelectedPeriod(period || null);
    }
  };

  const LoadingSkeleton = () => (
    <div className="p-4 md:p-6 space-y-4">
      <div className="max-w-md">
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-64 animate-pulse" />
          <div className="h-8 bg-gray-200 rounded w-16 animate-pulse" />
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

  const hasNoMetadata =
    !metadata?.period_options ||
    metadata.period_options.length === 0 ||
    !metadata.default_period;

  if (isMetadataError) {
    return (
      <div className="p-4 text-sm text-red-600">
        Failed to load accrual journal metadata
      </div>
    );
  }

  if (isMetadataLoading) {
    return <LoadingSkeleton />;
  }

  if (hasNoMetadata) {
    return (
      <div className="p-4 md:p-6">
        <NoDataFound
          title="No Accrual Data"
          subtitle={`There are no accrual periods available for ${leaveType}`}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 max-w-md">
        <Form
          key={selectedPeriod ?? "empty"}
          form={accrualPeriodForm}
          submission={{
            data: {
              accrual_period: selectedPeriod ?? "",
            },
          }}
          options={{ noAlerts: true }}
          onChange={handlePeriodChange}
        />
      </div>

      {!selectedPeriod ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <Calendar className="w-16 h-16 mb-4 text-gray-300" />
          <p className="text-sm font-medium">No accrual period selected</p>
          <p className="text-xs mt-1">
            Please select a period from the dropdown above
          </p>
        </div>
      ) : isEntriesLoading ? (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
              </div>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div className="h-6 bg-gray-200 rounded w-64 animate-pulse" />
              <div className="h-8 bg-gray-200 rounded w-16 animate-pulse" />
            </div>
          </div>
        </div>
      ) : isEntriesError ? (
        <div className="p-4 text-sm text-red-600">
          Failed to load accrual journal entries
        </div>
      ) : accrualEntries?.accrual_data ? (
        <>
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <h3 className="text-base font-semibold text-gray-800 mb-1">
                  Accrual Policy
                </h3>
                <p className="text-sm text-gray-600">
                  {accrualEntries.accrual_data.accrual_policy_text}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <h3 className="text-base font-semibold text-gray-800 mb-1">
                  Standard Formula
                </h3>
                <p className="text-sm text-gray-600">
                  ({accrualEntries.accrual_data.formula})
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between">
              <h3 className="base-title md:module-title font-semibold text-gray-800">
                Net Balance Credited this Accrual Period
              </h3>
              <span className="text-lg font-bold text-green-600">
                +{accrualEntries.accrual_data.net_balance_credited}
              </span>
            </div>
          </div>

          {accrualEntries.accrual_data.is_excluded === 1 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note: </strong>
                {accrualEntries.accrual_data.exclusion_reason && (
                  <span>{accrualEntries.accrual_data.exclusion_reason}</span>
                )}
              </p>
            </div>
          )}
        </>
      ) : (
        <NoDataFound title="No Accrual Data" subtitle="No accrual data available for the selected period." />
      )}
    </div>
  );
};

export default AccrualJournalTab;
