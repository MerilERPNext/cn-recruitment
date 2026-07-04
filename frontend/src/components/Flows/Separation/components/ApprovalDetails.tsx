"use client";

import { useMemo, ReactNode } from "react";
import { Typography } from "../../../shared/atoms/Typography";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import Tooltip from "../../../shared/Tooltip";
import { FlowRequestItem } from "../../../../types/flows";
import { AttachmentCard } from "../../../shared/molecules/AttachmentCard";

interface ApprovalDetailsProps {
  title: "Employee Separation" | "Employee Termination";
  data: FlowRequestItem;
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
      if (comp.rows) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        comp.rows.forEach((row: any) => {
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

export default function ApprovalDetails({
  title,
  data
}: ApprovalDetailsProps) {
  const isDesktop = useScreenSize();

  const detailsFields = useMemo(() => {
    const firstStage = data.approval_stages?.[0];
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
  }, [data.approval_stages]);

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
