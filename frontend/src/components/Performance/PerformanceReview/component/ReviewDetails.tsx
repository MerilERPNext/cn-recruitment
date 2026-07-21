"use client"

import { Calendar, Clock, Users, ArrowRight } from "lucide-react"
import Badge, { type BadgeVariant } from "../../../shared/Badge"
import { Typography } from "../../../shared/atoms/Typography"


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

const getStatusBadgeVariant = (status: string): BadgeVariant => {
  switch (status) {
    case "active":
      return "info"
    case "pending":
      return "warning"
    case "completed":
      return "success"
    default:
      return "default"
  }
}

const formatStatus = (status: string) => status.charAt(0).toUpperCase() + status.slice(1)

export function ReviewDetails() {
  return (
    <div className="space-y-4">
      <Typography variant="h3" className="mb-6 font-bold text-slate-900">
        Active Reviews
      </Typography>

      {reviewItems.map((item) => (
        <div
          key={item.id}
          className={`border rounded-lg p-6 transition-all hover:shadow-md ${getStatusColor(item.status)}`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Typography variant="h4" className="text-lg font-semibold text-slate-900">
                  {item.name}
                </Typography>
                <Badge label={formatStatus(item.status)} variant={getStatusBadgeVariant(item.status)} size="sm" />
              </div>
              <Typography variant="bodySmall" className="text-slate-600">
                Employee: {item.employee}
              </Typography>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {/* Employee Info */}
            <div>
              <Typography variant="caption" className="mb-1 block font-medium text-slate-500">
                Department
              </Typography>
              <Typography variant="bodySmall" className="font-medium text-slate-900">
                {item.department}
              </Typography>
            </div>

            {/* Start Date */}
            <div>
              <Typography variant="caption" className="mb-1 flex items-center gap-1 font-medium text-slate-500">
                <Calendar className="w-3 h-3" /> Start Date
              </Typography>
              <Typography variant="bodySmall" className="font-medium text-slate-900">
                {item.startDate}
              </Typography>
            </div>

            {/* Due Date */}
            <div>
              <Typography variant="caption" className="mb-1 flex items-center gap-1 font-medium text-slate-500">
                <Clock className="w-3 h-3" /> Due Date
              </Typography>
              <Typography variant="bodySmall" className="font-medium text-slate-900">
                {item.dueDate}
              </Typography>
            </div>

            {/* Reviewer */}
            <div>
              <Typography variant="caption" className="mb-1 flex items-center gap-1 font-medium text-slate-500">
                <Users className="w-3 h-3" /> Reviewer
              </Typography>
              <Typography variant="bodySmall" className="font-medium text-slate-900">
                {item.reviewer}
              </Typography>
            </div>
          </div>

          <div className="flex items-center justify-start">
            <button className="bg-blue-600 p-2 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2" aria-label={`Go to ${item.name}`}>
              <Typography variant="bodySmall" component="span" className="font-medium text-white">
                Go To Review
              </Typography>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
