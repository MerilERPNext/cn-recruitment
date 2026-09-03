import  { JSX } from 'react'
import PerformanceSkeleton from '../../PerformanceSkeleton'

const GoalDetailSkeleton = ():JSX.Element => {
  return (
      <PerformanceSkeleton className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-full overflow-hidden">
          <div className="p-4 sm:p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col md:flex-row justify-between gap-4 sm:gap-6 min-w-0 max-w-full overflow-hidden">
              <div className="flex-1 space-y-4 min-w-0 max-w-full">
                  <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-12 rounded-md bg-purple-500/20 shrink-0" />
                      <div className="h-6 w-20 rounded-md bg-slate-500/20 shrink-0" />
                  </div>
                  <div className="space-y-2 min-w-0">
                      <div className="h-6 sm:h-7 w-3/4 max-w-[240px] rounded bg-slate-500/20" />
                      <div className="h-4 w-1/2 max-w-[140px] rounded bg-slate-500/20" />
                  </div>
                  <div className="border-t border-border pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                      <div className="space-y-1 min-w-0">
                          <div className="h-3 w-12 sm:w-14 rounded bg-slate-500/20" />
                          <div className="h-4 w-20 sm:w-24 rounded bg-slate-500/20" />
                      </div>
                      <div className="space-y-1 min-w-0">
                          <div className="h-3 w-12 sm:w-14 rounded bg-slate-500/20" />
                          <div className="h-4 w-20 sm:w-24 rounded bg-slate-500/20" />
                      </div>
                      <div className="space-y-1 min-w-0">
                          <div className="h-3 w-12 sm:w-14 rounded bg-slate-500/20" />
                          <div className="h-4 w-20 sm:w-24 rounded bg-slate-500/20" />
                      </div>
                      <div className="space-y-1 min-w-0">
                          <div className="h-3 w-14 sm:w-16 rounded bg-slate-500/20" />
                          <div className="h-4 w-10 sm:w-12 rounded bg-slate-500/20" />
                      </div>
                  </div>
              </div>
              <div className="w-full md:w-48 h-32 sm:h-36 rounded-2xl bg-slate-500/10 p-4 flex flex-col items-center justify-center gap-2 shrink-0">
                  <div className="h-14 sm:h-16 w-14 sm:w-16 rounded-md bg-slate-500/20" />
                  <div className="h-3 w-12 rounded bg-slate-500/20" />
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0 max-w-full">
              <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0 max-w-full">
                  <div className="p-4 sm:p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4 min-w-0 max-w-full overflow-hidden">
                      <div className="flex justify-between items-center min-w-0">
                          <div className="h-6 w-28 sm:w-32 rounded bg-slate-500/20 shrink-0" />
                          <div className="h-8 w-16 rounded-lg bg-slate-500/20 shrink-0" />
                      </div>
                      <div className="p-3.5 sm:p-4 rounded-xl border border-border space-y-3 min-w-0 max-w-full overflow-hidden">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0 max-w-full">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div className="h-5 w-10 rounded-md bg-purple-500/20 shrink-0" />
                                  <div className="h-4 w-3/4 max-w-[160px] sm:max-w-[200px] rounded bg-slate-500/20 min-w-0" />
                              </div>
                              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                                  <div className="h-4 w-20 sm:w-24 rounded bg-slate-500/20" />
                                  <div className="h-7 sm:h-8 w-16 sm:w-20 rounded-lg bg-slate-500/20 shrink-0" />
                              </div>
                          </div>
                          <div className="h-2 w-full rounded-md bg-slate-500/20" />
                      </div>
                  </div>

                  <div className="p-4 sm:p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4 min-w-0 max-w-full overflow-hidden">
                      <div className="h-6 w-32 sm:w-36 rounded bg-slate-500/20" />
                      <div className="h-20 sm:h-24 w-full rounded-xl bg-slate-500/10" />
                  </div>
              </div>

              <div className="p-4 sm:p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4 min-w-0 max-w-full overflow-hidden">
                  <div className="space-y-1 min-w-0">
                      <div className="h-6 w-28 rounded bg-slate-500/20" />
                      <div className="h-3.5 w-36 sm:w-40 rounded bg-slate-500/20" />
                  </div>
                  <div className="h-40 sm:h-48 rounded-xl bg-slate-500/10 flex items-center justify-center">
                      <div className="h-6 w-28 sm:w-32 rounded bg-slate-500/20" />
                  </div>
              </div>
          </div>
      </PerformanceSkeleton>
  )
}

export default GoalDetailSkeleton