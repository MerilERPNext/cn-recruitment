import { ReviewDetails } from "./component/ReviewDetails"
import { ReviewWorkflow } from "./component/ReviewWorkflow"


const PerformanceReviewApp = () => {
  return (
    <main className="min-h-screen z-50 bg-gradient-to-b from-slate-50 to-slate-100">
    <div className="w-full mx-auto px-6 py-2">
      {/* Header */}
      <div className="mb-2 border bg-blue-100 rounded py-2 px-4 border-slate-200 pb-4">
        <h6 className=" font-bold text-slate-900 ">Review</h6>
        <p className="text-slate-600">Track and manage team member evaluations through each stage</p>
      </div>

      {/* Workflow Section */}
      <ReviewWorkflow />

      {/* Details Section */}
      <div className="mt-12">
        <ReviewDetails />
      </div>
    </div>
  </main>
  )
}

export default PerformanceReviewApp