"use client"

interface ApprovalStage {
  stage_name: string | null
  user: string | null
  role: string | null
  status: "Approved" | "Pending" | "Rejected"
}

interface ApprovalStagesProps {
  stages: ApprovalStage[]
}

export default function ApprovalStages({ stages }: ApprovalStagesProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Approved":
        return (
          <div className="w-6 h-6 text-green-500">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )
      case "Pending":
        return (
          <div className="w-6 h-6 text-yellow-500">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )
      case "Rejected":
        return (
          <div className="w-6 h-6 text-red-500">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "text-green-600"
      case "Pending":
        return "text-yellow-600"
      case "Rejected":
        return "text-red-600"
      default:
        return "text-slate-600"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "Approved":
        return "Approved"
      case "Pending":
        return "Pending"
      case "Rejected":
        return "Rejected"
      default:
        return status
    }
  }

  return (
    <div className="space-y-4">
      {stages.map((stage, index) => (
        <div key={index} className="relative">
          {index < stages.length - 1 && <div className="absolute left-3 top-12 w-0.5 h-8 bg-slate-200" />}

          <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all">
            <div className="flex items-start gap-4">
              {/* Status Icon */}
              <div className="flex-shrink-0 mt-1">{getStatusIcon(stage.status)}</div>

              {/* Content */}
              <div className="flex-grow">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">Stage {index + 1}</p>
                    <p className={`text-sm font-semibold ${getStatusColor(stage.status)}`}>
                      {getStatusLabel(stage.status)}
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  {stage.user && (
                    <div>
                      <span className="text-slate-500">Assigned To:</span>
                      <p className="font-medium text-slate-900">{stage.user}</p>
                    </div>
                  )}
                  {stage.role && (
                    <div>
                      <span className="text-slate-500">Role:</span>
                      <p className="font-medium text-slate-900">{stage.role}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
