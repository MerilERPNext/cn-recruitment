import  { JSX } from 'react'
import PerformanceSkeleton from '../../PerformanceSkeleton'

const GoalDetailSkeleton = ():JSX.Element => {
  return (
      <PerformanceSkeleton className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-full overflow-hidden">
          <div className="p-4 sm:p-6 rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col md:flex-row justify-between gap-4 sm:gap-6 min-w-0 max-w-full overflow-hidden">
              <div className="flex-1 space-y-4 min-w-0 max-w-full">
                  <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-12 rounded-md bg-purple-100/80 shrink-0" />
                      <div className="h-6 w-20 rounded-md bg-gray-200 shrink-0" />
                  </div>
                  <div className="space-y-2 min-w-0">
                      <div className="h-6 sm:h-7 w-3/4 max-w-[240px] rounded bg-gray-200" />
                      <div className="h-4 w-1/2 max-w-[140px] rounded bg-gray-200" />
                  </div>
                  <div className="border-t border-gray-100 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                      <div className="space-y-1 min-w-0">
                          <div className="h-3 w-12 sm:w-14 rounded bg-gray-200" />
                          <div className="h-4 w-20 sm:w-24 rounded bg-gray-200" />
                      </div>
                      <div className="space-y-1 min-w-0">
                          <div className="h-3 w-12 sm:w-14 rounded bg-gray-200" />
                          <div className="h-4 w-20 sm:w-24 rounded bg-gray-200" />
                      </div>
                      <div className="space-y-1 min-w-0">
                          <div className="h-3 w-12 sm:w-14 rounded bg-gray-200" />
                          <div className="h-4 w-20 sm:w-24 rounded bg-gray-200" />
                      </div>
                      <div className="space-y-1 min-w-0">
                          <div className="h-3 w-14 sm:w-16 rounded bg-gray-200" />
                          <div className="h-4 w-10 sm:w-12 rounded bg-gray-200" />
                      </div>
                  </div>
              </div>
              <div className="w-full md:w-48 h-32 sm:h-36 rounded-2xl bg-gray-100/70 p-4 flex flex-col items-center justify-center gap-2 shrink-0">
                  <div className="h-14 sm:h-16 w-14 sm:w-16 rounded-md bg-gray-200" />
                  <div className="h-3 w-12 rounded bg-gray-200" />
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0 max-w-full">
              <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0 max-w-full">
                  <div className="p-4 sm:p-6 rounded-2xl border border-gray-100 bg-white shadow-sm space-y-4 min-w-0 max-w-full overflow-hidden">
                      <div className="flex justify-between items-center min-w-0">
                          <div className="h-6 w-28 sm:w-32 rounded bg-gray-200 shrink-0" />
                          <div className="h-8 w-16 rounded-lg bg-gray-200 shrink-0" />
                      </div>
                      <div className="p-3.5 sm:p-4 rounded-xl border border-gray-100 space-y-3 min-w-0 max-w-full overflow-hidden">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0 max-w-full">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div className="h-5 w-10 rounded-md bg-purple-100/80 shrink-0" />
                                  <div className="h-4 w-3/4 max-w-[160px] sm:max-w-[200px] rounded bg-gray-200 min-w-0" />
                              </div>
                              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                                  <div className="h-4 w-20 sm:w-24 rounded bg-gray-200" />
                                  <div className="h-7 sm:h-8 w-16 sm:w-20 rounded-lg bg-gray-200 shrink-0" />
                              </div>
                          </div>
                          <div className="h-2 w-full rounded-md bg-gray-200" />
                      </div>
                  </div>

                  <div className="p-4 sm:p-6 rounded-2xl border border-gray-100 bg-white shadow-sm space-y-4 min-w-0 max-w-full overflow-hidden">
                      <div className="h-6 w-32 sm:w-36 rounded bg-gray-200" />
                      <div className="h-20 sm:h-24 w-full rounded-xl bg-gray-100/70" />
                  </div>
              </div>

              <div className="p-4 sm:p-6 rounded-2xl border border-gray-100 bg-white shadow-sm space-y-4 min-w-0 max-w-full overflow-hidden">
                  <div className="space-y-1 min-w-0">
                      <div className="h-6 w-28 rounded bg-gray-200" />
                      <div className="h-3.5 w-36 sm:w-40 rounded bg-gray-200" />
                  </div>
                  <div className="h-40 sm:h-48 rounded-xl bg-gray-100/70 flex items-center justify-center">
                      <div className="h-6 w-28 sm:w-32 rounded bg-gray-200" />
                  </div>
              </div>
          </div>
      </PerformanceSkeleton>
  )
}

export default GoalDetailSkeleton