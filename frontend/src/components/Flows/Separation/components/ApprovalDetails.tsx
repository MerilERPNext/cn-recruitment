/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo } from "react";
import { Typography } from "../../../shared/atoms/Typography";

import formatToIndianDate from "../../../../utils/formatToIndianDate";

interface ApprovalDetailsProps {
  isPending: boolean;
  data: any;
  title: "Employee Separation";
}

export default function ApprovalDetails({
  isPending,
  data,
  title,
}: ApprovalDetailsProps) {
  const doc = data.reference_document;

  const detailsFields = useMemo(() => {
    const fields = [
      { label: "Employee ID", value: doc.employee },
      { label: "Employee Name", value: doc.employee_name },
      { label: "Designation", value: doc.designation },
      { label: "Department", value: doc.department },
    ];
    if (title === "Employee Separation") {
      fields.splice(
        4,
        0,
        {
          label: "Date of Joining",
          value: formatToIndianDate(doc.custom_date_of_joining),
        },
        { label: "Status", value: isPending ? "Pending" : doc.custom_status },
      );
    }

    return fields;
  }, [title, doc]);

  return (
    <div className="space-y-4">
      <div className="md:bg-white bg-blue-50 border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>

        <div className="grid grid-cols-2 gap-6">
          {detailsFields.map((field, index) => (
            <div key={index} className="space-y-1">
              <Typography variant="bodySmall">{field.label}</Typography>
              <Typography
                variant="bodyMedium"
                className="truncate text-ellipsis"
              >
                {field.value}
              </Typography>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
