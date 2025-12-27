export const StatusBadge = ({ status }: { status: string }) => {
  const baseStyle = "px-2 py-1 rounded-2xl text-xs inline-block"
  const statusStyles: { [key: string]: string } = {
    Open: "bg-blue-100 text-blue-800",
    Draft: "bg-yellow-100 text-yellow-800", // styling "Draft" ka use hoga
    Rejected: "bg-red-100 text-red-800",
    Completed: "bg-blue-100 text-blue-800",
    Current: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    Upcoming: "bg-blue-100 text-blue-700 border border-blue-200",
    Previous: "bg-slate-100 text-slate-600 border border-slate-300",
    Active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    Inactive: "bg-gray-100 text-gray-600 border border-gray-300",
    "Pending Approval": "bg-yellow-100 text-yellow-800",
    Approved: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  }

  const displayStatus = status === "Draft" ? "Pending" : status

  return (
    <span className={`${baseStyle} ${statusStyles[status] || "bg-gray-100 text-gray-800"}`}>
      {displayStatus}
    </span>
  )
}

