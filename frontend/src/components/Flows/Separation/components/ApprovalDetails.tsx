"use client";

import { useMemo } from "react";
import { Typography } from "../../../shared/atoms/Typography";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import Tooltip from "../../../shared/Tooltip";
import { FlowRequestItem } from "../../../../types/flows";
import { useEmployeeSeparationDetails } from "../../../../hooks/useSeparation";

interface ApprovalDetailsProps {
  title: "Employee Separation" | "Employee Termination";
  data: FlowRequestItem;
}

export default function ApprovalDetails({
  title,
  data
}: ApprovalDetailsProps) {
  const referenceName = data.approval_stages?.[0]?.todo?.reference_name ?? "";

  const { data: separationDetails, isPending: isLoading } =
    useEmployeeSeparationDetails(referenceName);

  const isDesktop = useScreenSize();

  const detailsFields = useMemo(() => {
    if (!separationDetails) return [];

    const fields: { label: string; value: string }[] = [
      {
        label: "Date of Resignation",
        value: separationDetails?.custom_resignation_date
          ? formatToIndianDate(separationDetails?.custom_resignation_date)
          : "—",
      },
      {
        label: "Assigned Notice Period (Day(s))",
        value: separationDetails?.custom_notice_period_days != null
          ? String(separationDetails?.custom_notice_period_days)
          : "—",
      },
      {
        label: "Recovery Days",
        value: separationDetails?.custom_final_recovery_days != null
          ? String(separationDetails?.custom_final_recovery_days)
          : "—",
      },
      {
        label: "Reason for Separation",
        value: separationDetails?.custom_final_reason_for_separation || "—",
      },
      {
        label: "Proposed Recovery Day (Days)",
        value: separationDetails?.custom_proposed_recovery_days != null
          ? String(separationDetails?.custom_proposed_recovery_days)
          : "—",
      },
      {
        label: "Final Separation Category",
        value: separationDetails?.custom_final_category_for_separation || "—",
      },
      {
        label: "Final Reason for Separation",
        value: separationDetails?.custom_final_reason_for_separation || "—",
      },
      {
        label: "Do Not Rehire",
        value: separationDetails?.custom_mark_do_not_rehire ? "Yes" : "No",
      },
      {
        label: "Reason for Proposed Recovery Days",
        value: separationDetails?.custom_reason_for_proposed_recovery_days || "—",
      },
      {
        label: "Proposed Last Working Day",
        value: separationDetails?.custom_proposed_last_working_day
          ? formatToIndianDate(separationDetails?.custom_proposed_last_working_day)
          : "—",
      },
      {
        label: "Requested Last Working Day",
        value: separationDetails?.custom_requested_last_working_date
          ? formatToIndianDate(separationDetails?.custom_requested_last_working_date)
          : "—",
      },
      {
        label: "LWD as per Notice Period",
        value: separationDetails?.custom_proposed_last_working_day
          ? formatToIndianDate(separationDetails?.custom_proposed_last_working_day)
          : "—",
      },
    ];

    return fields;
  }, [separationDetails]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="md:bg-white bg-blue-50 border border-slate-200 rounded-lg p-6">
          <div className="h-5 w-40 bg-gray-200 rounded mb-4" />

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-20 bg-gray-200 rounded" />
                <div className="h-4 w-32 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!separationDetails) return null;

  return (
    <div className="space-y-4">
      <div className="md:bg-white bg-blue-50 border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {detailsFields.map((field, index) => (
            <div key={index} className="space-y-1">
              <Typography variant={isDesktop ? "bodySmall" : "mobileCardLabel"}>{field.label}</Typography>
              <Typography
                variant={isDesktop ? "bodyMedium" : "mobileCardValue"}
                className="truncate text-ellipsis"
              >
                <Tooltip content={field.value} position="top" className="truncate text-ellipsis">
                  {field.value}
                </Tooltip>
              </Typography>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
