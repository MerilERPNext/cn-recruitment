const FormGridSkeleton = () => {
  return (
    <div className="container mx-auto">
      <form className="h-full gap-6 border-2 border-gray-200 p-2 rounded-sm">
        <div className="flex  gap-2 animate-pulse">
          <div className="h-10 bg-gray-300 rounded w-20 mb-4 flex-1"></div>
          <div className="h-10 bg-gray-300 rounded w-20 mb-4 flex-1"></div>
          <div className="h-10 bg-gray-300 rounded w-20 mb-4 flex-1"></div>
          <div className="h-10 bg-gray-300 rounded w-20 mb-4 flex-1"></div>
          <div className="h-10 bg-gray-300 rounded w-20 mb-4 flex-1"></div>
          <div className="h-10 bg-gray-300 rounded w-20 mb-4 flex-1"></div>
        </div>
        <div className="flex flex-col animate-pulse">
          <div className="h-10 bg-gray-300 rounded w-full mb-4"></div>
        </div>
        <div className="flex flex-col animate-pulse">
          <div className="h-10 bg-gray-300 rounded w-full mb-4"></div>
        </div>

        <div className="flex flex-col animate-pulse">
          <div className="h-10 bg-gray-300 rounded w-full mb-4"></div>
        </div>

        <div className="flex flex-col animate-pulse">
          <div className="h-20 bg-gray-300 rounded w-full mb-4"></div>
        </div>

        <div className="flex flex-col animate-pulse">
          <div className="h-10 bg-gray-300 rounded w-full mb-4"></div>
        </div>

        <div className="flex flex-col animate-pulse">
          <div className="h-10 bg-gray-300 rounded w-full mb-4"></div>
        </div>

        <div className="flex animate-pulse gap-4">
          <div className="h-12 bg-gray-300 rounded w-1/2 mb-4"></div>
          <div className="h-12 bg-gray-300 rounded-md w-1/2 mb-4"></div>
        </div>
        <div className="flex flex-col animate-pulse">
          <div className="h-10 bg-gray-300 rounded w-full mb-4"></div>
        </div>

        <div className="flex flex-col animate-pulse">
          <div className="h-10 bg-gray-300 rounded w-full mb-4"></div>
        </div>

        <div className="flex flex-col animate-pulse">
          <div className="h-10 bg-gray-300 rounded w-full mb-4"></div>
        </div>

        <div className="flex flex-col animate-pulse">
          <div className="h-10 bg-gray-300 rounded w-full mb-4"></div>
        </div>

        <div className="flex animate-pulse gap-4">
          <div className="h-20 bg-gray-300 rounded w-full mb-4"></div>
        </div>
      </form>
    </div>
  );
};

export default FormGridSkeleton;
