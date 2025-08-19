export const MyLeaveRequestSkeleton: React.FC = () => {
  return (
    <div>
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg border border-gray-200 p-3 mb-3 shadow-sm animate-pulse"
        >
          <div className="flex flex-wrap md:flex-nowrap items-start justify-between gap-3">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <div className="w-8 h-8 bg-gray-200 rounded-lg flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-200 rounded w-3/4 mt-2" />
              </div>
            </div>
            <div className="h-5 w-20 bg-gray-200 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const TeamLeaveRequestSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 mb-3 shadow-sm animate-pulse">
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 bg-gray-200 rounded-lg flex-shrink-0" />
          <div className="space-y-2 w-full">
            <div className="h-4 bg-gray-200 rounded w-2/5" />
            <div className="h-3 bg-gray-200 rounded w-3/5" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
        <div className="h-5 w-16 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
};

export const LeaveBalanceSkeleton: React.FC = () => {
  return (
    <div>
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="rounded-xl my-4 p-4 m-4 shadow-sm border border-gray-200 bg-white animate-pulse"
        >
          <div className="flex justify-between items-center mb-3">
            <div className="h-6 w-32 bg-gray-200 rounded"></div>
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
          </div>

          <div className="flex justify-between mt-2">
            <div className="flex-1 text-center">
              <div className="h-6 w-10 bg-gray-200 rounded mx-auto mb-1"></div>
              <div className="h-4 w-16 bg-gray-100 rounded mx-auto"></div>
            </div>
            <div className="flex-1 text-center border-x px-2">
              <div className="h-6 w-10 bg-gray-200 rounded mx-auto mb-1"></div>
              <div className="h-4 w-16 bg-gray-100 rounded mx-auto"></div>
            </div>
            <div className="flex-1 text-center">
              <div className="h-6 w-10 bg-gray-200 rounded mx-auto mb-1"></div>
              <div className="h-4 w-16 bg-gray-100 rounded mx-auto"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const HolidayCardSkeleton: React.FC = () => {
  return (
    <div className="flex border border-gray-100 items-center justify-between gap-3 bg-white shadow-sm rounded-xl p-2 mb-2 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-gray-200" />

        <div className="flex flex-col gap-1">
          <div className="h-4 w-28 bg-gray-200 rounded" />
          <div className="h-3 w-20 bg-gray-200 rounded" />
        </div>
      </div>

      <div className="h-8 w-20 bg-gray-200 rounded-lg" />
    </div>
  );
};

export const HolidayCardSkeletonList: React.FC<{ count?: number }> = ({
  count = 6,
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <HolidayCardSkeleton key={i} />
      ))}
    </>
  );
};
