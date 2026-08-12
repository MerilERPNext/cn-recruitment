import PerformanceSkeleton from '../PerformanceSkeleton'

const SkillSkeleton = () => {
  return (
      <PerformanceSkeleton className="space-y-4 lg:space-y-5">
            <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between min-w-0">
              <div className="space-y-2 min-w-0 flex-1">
                <div className="h-6 sm:h-7 w-3/4 max-w-[320px] rounded bg-gray-200" />
                <div className="h-4 w-1/2 max-w-[220px] rounded bg-gray-200" />
              </div>
              <div className="flex gap-3 shrink-0">
                <div className="h-10 w-28 rounded-lg bg-gray-200" />
                <div className="h-10 w-28 rounded-lg bg-gray-200" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 min-w-0">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-3 min-w-0">
                  <div className="h-3 w-28 rounded bg-gray-200" />
                  <div className="h-8 w-16 rounded bg-gray-200" />
                  <div className="h-3 w-36 rounded bg-gray-200" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px] min-w-0">
              <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-4 space-y-4 min-w-0">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100 min-w-0">
                  <div className="h-5 w-24 rounded bg-gray-200 shrink-0" />
                  <div className="flex gap-2 min-w-0 overflow-hidden">
                    <div className="h-6 w-16 rounded-md bg-gray-200 shrink-0" />
                    <div className="h-6 w-16 rounded-md bg-gray-200 shrink-0" />
                  </div>
                </div>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2 pt-2 min-w-0">
                    <div className="h-4 w-36 rounded bg-gray-200" />
                    <div className="h-12 w-full rounded-lg bg-gray-100/70" />
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-4 flex flex-col items-center justify-center min-h-[300px] min-w-0">
                <div className="h-6 w-32 rounded bg-gray-200" />
                <div className="h-44 w-44 rounded-md bg-gray-100/80" />
              </div>
            </div>
          </PerformanceSkeleton>
  )
}

export default SkillSkeleton