/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useMemo } from "react";
import { formatDashedDate } from "../../../../utils/formatToIndianDate";
import { Typography } from "../../../shared/atoms/Typography";



interface ApprovalDetailsProps {
  data: any;
  title: "Employee Separation" | "Employee Confirmation";
}


export default function ApprovalDetails({ data, title }: ApprovalDetailsProps) {
  const doc = data.reference_document

  const detailsFields = useMemo(() => {
    const fields = [
      { label: "Employee ID", value: doc.employee },
      { label: "Employee Name", value: doc.employee_name },
      { label: "Designation", value: doc.designation },
      { label: "Department", value: doc.department },
    ];

    if (title === "Employee Confirmation") {
      if (data.status != "Confirmed")
        fields.push({ label: "Probation End Date", value: formatDashedDate(doc.probation_end_date) });
      fields.splice(4, 0,
        { label: "Date of Joining", value: formatDashedDate(doc.date_of_joining) },
        { label: "Status", value: doc.status }
      );
    } else if (title === "Employee Separation") {
      fields.splice(4, 0, { label: "Date of Joining", value: formatDashedDate(doc.custom_date_of_joining) }, { label: "Status", value: doc.custom_status });
    }

    return fields;
  }, [title, doc]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="w-5 h-5 text-green-600 flex-shrink-0">
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <Typography variant="bodySmall" >
          <span className="font-medium text-green-800">
            All Approvals Completed Succesfully
          </span>
        </Typography>

      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {detailsFields.map((field, index) => (
            <div key={index} className="space-y-1">
              <Typography variant="label" >
                {field.label}
              </Typography>
              <Typography variant="bodyMedium" >
                {field.value}
              </Typography>
            </div>
          ))}
        </div>
      </div>
    </div >
  )
}
