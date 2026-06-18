import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Typography } from "../../../shared/atoms/Typography";

const HistoryPagination = ({ totalRecords }: { totalRecords: number }) => (
  <div className="mt-4 flex flex-col gap-3 text-gray-600 sm:flex-row sm:items-center sm:justify-between">
    <Typography variant="bodySmall" className="font-medium">
      {totalRecords > 0
        ? `1 - ${totalRecords} of ${totalRecords} Records`
        : "0 Records"}
    </Typography>

    <div className="flex items-center justify-between gap-5 sm:justify-end">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="flex h-8 min-w-8 items-center justify-center rounded-md bg-gray-100 px-3 text-sm font-semibold text-gray-700"
        >
          1
        </button>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <button
        type="button"
        className="flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
      >
        10
        <ChevronDown className="h-4 w-4" />
        <span className="text-xs text-gray-500">per page</span>
      </button>
    </div>
  </div>
);

export default HistoryPagination;
