
export const LoadingAllOrgSkeleton = () => {
  return (
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
              <div
                  key={index}
                  className="flex min-h-[132px] flex-col justify-between rounded-xl border border-gray-100 bg-gray-50/70 p-4 animate-pulse"
              >
                  <div className="flex items-center justify-between">
                      <div className="h-3 w-16 rounded bg-gray-200" />
                      <div className="h-4 w-12 rounded bg-gray-200" />
                  </div>
                  <div className="my-3 space-y-2">
                      <div className="h-4 w-3/4 rounded bg-gray-200" />
                      <div className="h-3 w-1/2 rounded bg-gray-200" />
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                      <div className="h-3 w-24 rounded bg-gray-200" />
                      <div className="h-7 w-20 rounded-md bg-gray-200" />
                  </div>
              </div>
          ))}
      </div>
  )
}

export default LoadingAllOrgSkeleton;