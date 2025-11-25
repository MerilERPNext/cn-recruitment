"use client"

import { Calendar, Clock, Users, ArrowRight } from "lucide-react"


interface ReviewItem {
  id: number
  name: string
  employee: string
  department: string
  startDate: string
  dueDate: string
  reviewer: string
  status: "active" | "pending" | "completed"
}

const reviewItems: ReviewItem[] = [
  {
    id: 1,
    name: "Performance Review",
    employee: "Sarah Johnson",
    department: "Engineering",
    startDate: "15-11-2025",
    dueDate: "20-12-2025",
    reviewer: "Michael Chen",
    status: "active",
  },

]

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-gray-100 border-gray-200"
    case "pending":
      return "bg-amber-50 border-amber-200"
    case "completed":
      return "bg-emerald-50 border-emerald-200"
    default:
      return "bg-slate-50 border-slate-200"
  }
}

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-blue-100 text-blue-700"
    case "pending":
      return "bg-amber-100 text-amber-700"
    case "completed":
      return "bg-emerald-100 text-emerald-700"
    default:
      return "bg-slate-100 text-slate-700"
  }
}

export function ReviewDetails() {
  return (
    <div className="space-y-4">
      <h1 className=" font-bold text-slate-900 mb-6">Active Reviews</h1>

      {reviewItems.map((item) => (
        <div
          key={item.id}
          className={`border rounded-lg p-6 transition-all hover:shadow-md ${getStatusColor(item.status)}`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
                <span className={`text-xs font-semibold px-3 py-1 rounded-lg ${getStatusBadgeColor(item.status)}`}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </span>
              </div>
              <p className="text-sm text-slate-600">Employee: {item.employee}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {/* Employee Info */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Department</p>
              <p className="text-sm font-medium text-slate-900">{item.department}</p>
            </div>

            {/* Start Date */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Start Date
              </p>
              <p className="text-sm font-medium text-slate-900">{item.startDate}</p>
            </div>

            {/* Due Date */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Due Date
              </p>
              <p className="text-sm font-medium text-slate-900">{item.dueDate}</p>
            </div>

            {/* Reviewer */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                <Users className="w-3 h-3" /> Reviewer
              </p>
              <p className="text-sm font-medium text-slate-900">{item.reviewer}</p>
            </div>
          </div>

          <div className="flex items-center justify-start">
            <button className="bg-blue-600 p-2 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2">
              Go To Review <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
