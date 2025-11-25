/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import ApprovalDetails from "./ApprovalDetails"
import ApprovalModal from "./ApprovalModel"

interface ApprovalStage {
  stage_name: string | null
  user: string | null
  role: string | null
  status: "Approved" | "Pending" | "Rejected"
}

interface ReferenceDocument {
  name: string
  employee_name: string
  designation: string
  department: string
  date_of_joining: string
  [key: string]: any
}

interface ApprovalData {
  todo_id: string
  reference_type: string
  reference_name: string
  description: string
  due_date: string
  todo_status: string
  role: string
  approval_stages_status: ApprovalStage[]
  reference_document: ReferenceDocument
}

interface ApprovalTrackerProps {
  data: ApprovalData
}

export default function SeparationApprovalTracker({ data }: ApprovalTrackerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  if (!data) {
    return (
      <div className="bg-white rounded-2xl shadow p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-700">Approval Tracker</h3>
        <p className="text-sm text-gray-500">No approval data available.</p>
      </div>
    );
  }
  const allStagesComplete =
  data?.approval_stages_status?.every(
    (stage) => stage.status === "Approved" || stage.status === "Rejected"
  ) ?? false

  const pendingCount =
  data?.approval_stages_status?.filter((s) => s.status === "Pending").length ?? 0


  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col gap-4">
          {/* Header Section */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-900">{data.reference_type}</h2>
            <p className="text-sm text-slate-500">{data.reference_name}</p>
            <p className="text-sm text-slate-700">{data.description}</p>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {allStagesComplete ? (
              <>
                <div className="w-5 h-5 text-green-500">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-sm font-medium text-green-600">Completed all stages</span>
              </>
            ) : (
              <>
                <div className="w-5 h-5 text-yellow-500">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-sm font-medium text-yellow-600">Pending - {pendingCount} approvals</span>
              </>
            )}
          </div>

          {/* Action Button or Details */}
          <div className="mt-4">
            {allStagesComplete ? (
              <ApprovalDetails data={data} />
            ) : (
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
               See Approval Status 
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && <ApprovalModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={data} />}
    </div>
  )
}
