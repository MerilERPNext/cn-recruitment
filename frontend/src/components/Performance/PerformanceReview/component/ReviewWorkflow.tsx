"use client"

const workflowSteps = [
  {
    id: 1,
    title: "Employee",
    subtitle: "completed",
    status: "completed",
  },
  {
    id: 2,
    title: "Manager",
    subtitle: "completed",
    status: "completed",
  },
  {
    id: 3,
    title: "L2 Manager",
    subtitle: "pending",
    status: "pending",
  },
  {
    id: 4,
    title: "HRBP",
    subtitle: "pending ",
    status: "pending",
  },
  {
    id: 5,
    title: "Calibration",
    subtitle: "in-progress",
    status: "pending",
  },

]

export function ReviewWorkflow() {



  return (
    <div className="bg-white rounded border border-slate-200 px-8 py-4">
      {/* Steps Container */}
      <div className="flex items-center justify-between relative">
        <div className="absolute top-[10px] left-[30px] right-[30px] h-1 flex">
          {workflowSteps.slice(0, -1).map((step, index) => {
            const isCompleted = step.status === "completed" || step.status === "approved"
            return (
              <div
                key={`line-${index}`}
                className={`flex-1 transition-colors duration-300 ${isCompleted ? "bg-emerald-500" : "bg-slate-300"}`}
              />
            )
          })}
        </div>

        {/* Steps */}
        <div className="flex justify-between w-full gap-0 relative z-10">
          {workflowSteps.map((step) => (
            <div key={step.id} className="flex flex-col items-center">
              {/* Circle with Number */}
              <div className="relative mb-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    step.status === "completed"
                      ? "bg-emerald-500 text-white"
                      : step.status === "in-progress"
                        ? "bg-slate-700 text-white"
                        : "bg-slate-300 text-slate-600"
                  }`}
                >
                  {step.id}
                </div>
              </div>

              {/* Step Label */}
              <p className="text-center text-xs font-semibold text-slate-900 mt-2 w-20">{step.title}</p>

              {/* Subtitle / Status */}
              {step.subtitle && <p className="text-center text-xs text-slate-500 mt-1">{step.subtitle}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
