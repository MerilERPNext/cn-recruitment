import HeaderBar from "../../HeaderBar";

const AdvanceFormSkeleton = () => {

  return (
    <div className="flex flex-col h-full bg-white">
      <HeaderBar title="New Expense Advance" />

      <div className="flex-1 overflow-y-auto p-4 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
          <div>
            <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
          <div>
            <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
          <div>
            <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <div className="h-4 bg-gray-300 rounded w-20 mb-2"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
          <div>
            <div className="h-4 bg-gray-300 rounded w-28 mb-2"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>

        <div className="mb-6">
          <div className="h-4 bg-gray-300 rounded w-20 mb-2"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>

        <div className="mt-8 border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-300 rounded w-40"></div>
            <div className="h-10 bg-gray-200 rounded w-48"></div>
          </div>

          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="h-4 bg-gray-300 rounded w-48 mx-auto mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-64 mx-auto"></div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-5 py-3 flex space-x-3">
        <div className="flex-1 h-12 bg-gray-200 rounded animate-pulse"></div>
        <div className="flex-1 h-12 bg-gray-300 rounded animate-pulse"></div>
      </div>
    </div>
  );
};

export default AdvanceFormSkeleton;
