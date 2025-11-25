/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"



interface ApprovalDetailsProps {
    data: any;
  }


export default function ApprovalDetails({ data }: ApprovalDetailsProps) {
  const doc = data.reference_document

  const detailsFields = [
    { label: "Employee ID", value: doc.employee },
    { label: "Employee Name", value: doc.employee_name },
    { label: "Designation", value: doc.designation },
    { label: "Department", value: doc.department },
    { label: "Date of Joining", value: doc.date_of_joining },
    { label: "Document Type", value: doc.doctype },
    { label: "Status", value: doc.status },
    { label: "Reference", value: data.reference_name },
  ]

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
        <span className="text-sm font-medium text-green-800">All Approvals Completed Succesfully</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Employee Confirmation </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {detailsFields.map((field, index) => (
            <div key={index} className="space-y-1">
              <p className="text-sm text-slate-500 font-medium">{field.label}</p>
              <p className="text-slate-900 font-semibold">{field.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
