"use client";

import { useMemo, ReactNode } from "react";
import { Typography } from "../../../shared/atoms/Typography";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import Tooltip from "../../../shared/Tooltip";
import { FlowRequestItem, FlowRequestDetailItem } from "../../../../types/flows";
import { AttachmentCard } from "../../../shared/molecules/AttachmentCard";
import { useEmployeeSeparationDetails } from "../../../../hooks/useSeparation";

interface ApprovalDetailsProps {
  title: "Employee Separation" | "Employee Termination";
  data: FlowRequestItem | FlowRequestDetailItem;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractFields = (components: any[], formData: Record<string, unknown>) => {
  const fields: { label: string; value: ReactNode }[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const traverse = (comps?: any[]) => {
    if (!comps || !Array.isArray(comps)) return;
    for (const comp of comps) {
      if (
        comp.input &&
        comp.key &&
        comp.label &&
        comp.type !== "button" &&
        comp.type !== "hidden" &&
        comp.type !== "datagrid" &&
        comp.type !== "editgrid" &&
        comp.type !== "table"
      ) {
        const value = formData[comp.key];
        let displayValue: ReactNode = value != null && value !== "" ? String(value) : "—";

        if (comp.type === "datetime" && value) {
          displayValue = formatToIndianDate(String(value));
        } else if (comp.type === "file" && value) {
          const files = Array.isArray(value) ? value : [value];
          if (files.length > 0) {
            displayValue = (
              <div className="flex flex-col gap-2 mt-2 w-full max-w-sm">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {files.map((f: any, i: number) => {
                  if (typeof f === "string") {
                    return <AttachmentCard key={i} fileUrl={f} compact={true} />;
                  }

                  const url = f?.data?.message?.file_url || f?.file_url || f?.url || f?.name;
                  const name = f?.originalName || f?.name || "Attachment";

                  if (!url) return null;

                  return (
                    <AttachmentCard
                      key={i}
                      fileUrl={url}
                      fileName={name}
                      compact={true}
                    />
                  );
                })}
              </div>
            );
          }
        }

        fields.push({
          label: comp.label,
          value: displayValue,
        });
      }
      if (comp.components) traverse(comp.components);
      if (comp.columns) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        comp.columns.forEach((col: any) => traverse(col.components));
      }
      if (comp?.rows && Array.isArray(comp?.rows)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        comp?.rows.forEach((row: any) => {
          if (Array.isArray(row)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            row.forEach((cell: any) => traverse(cell.components));
          }
        });
      }
    }
  };

  traverse(components);
  return fields;
};

function EmployeeSeparationDetails({ title, data }: ApprovalDetailsProps) {
  const referenceName = data.approval_stages?.[0]?.todo?.reference_name ?? "";

  const { data: separationDetails, isLoading: isLoading } =
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

  if (!separationDetails) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-blue-50/30 border border-dashed border-blue-200 rounded-lg text-center w-full">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
          <svg
            className="w-6 h-6 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <Typography variant="bodyMedium" className="font-semibold text-slate-800 mb-1">
          No Details Available
        </Typography>
        <Typography variant="bodySmall" color="body2" className="max-w-xs">
          There are no separation details linked to this request.
        </Typography>
      </div>
    );
  }

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

export default function ApprovalDetails({
  title,
  data
}: ApprovalDetailsProps) {
  const { isDesktop } = useScreenSize();

  const firstStage = data.approval_stages?.[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const showSeparationDetails = (firstStage?.todo as any)?.reference_document?.custom_created_from_confirmation === 0 || !firstStage?.form_data_display;

  const detailsFields = useMemo(() => {
    const components = firstStage?.form_json?.components;

    // form_data_display is expected to be a Record<string, unknown> as per types
    // but handle gracefully if it's stringified
    let formData = firstStage?.form_data_display || {};
    if (typeof formData === "string") {
      try {
        formData = JSON.parse(formData);
      } catch (e) {
        console.error("failed to parse form_data_display", e);
        formData = {};
      }
    }

    if (components && Array.isArray(components)) {
      return extractFields(components, formData);
    }

    return [];
  }, [firstStage?.form_data_display, firstStage?.form_json?.components]);

  if (showSeparationDetails) {
    return <EmployeeSeparationDetails title={title} data={data} />;
  }

  if (!detailsFields || detailsFields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-blue-50/30 border border-dashed border-blue-200 rounded-lg text-center w-full">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
          <svg
            className="w-6 h-6 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <Typography variant="bodyMedium" className="font-semibold text-slate-800 mb-1">
          No Details Available
        </Typography>
        <Typography variant="bodySmall" color="body2" className="max-w-xs">
          There are no separation details linked to this request.
        </Typography>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="md:bg-white bg-blue-50 border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {detailsFields.map((field, index) => (
            <div key={index} className="space-y-1">
              <Typography variant={isDesktop ? "bodySmall" : "mobileCardLabel"}>{field.label}</Typography>
              <div
                className="truncate text-ellipsis"
              >
                {typeof field.value === "string" ? (
                  <Tooltip content={field.value} position="top" className="truncate text-ellipsis">
                    <Typography variant={isDesktop ? "bodyMedium" : "mobileCardValue"} className="truncate text-ellipsis">
                      {field.value}
                    </Typography>
                  </Tooltip>
                ) : (
                  field.value
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
