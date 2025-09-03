import { User } from "lucide-react";
import FrappeListView from "../ListView";

interface TeamShiftItem {
  name: string;
  employee: string;
  employee_name: string;
  shift_type: string;
  start_date: string;
  end_date: string;
  status: string;
  modified: string;
}

const TeamShiftItemComponent = ({ item }: { item: TeamShiftItem }) => {
  const formatToIndianDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
          <User size={24} className="text-gray-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900">
            {item.employee_name || "N/A"}
          </h3>
          <div className="flex justify-between items-center gap-2 mb-2">
            <h2 className="text-[15px] font-bold text-gray-900">
              {item.shift_type}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div className="flex gap-1">
              <span className="text-gray-500">From:</span>
              <span className="font-medium text-black">
                {formatToIndianDate(item.start_date)}
              </span>
            </div>
            <div className="flex gap-1">
              <span className="text-gray-500">To:</span>
              <span className="font-medium text-black">
                {formatToIndianDate(item.end_date)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TeamShiftSkeleton = () => {
  return (
    <div className="bg-white border-gray-200 p-2 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-gray-200 rounded-full"></div>
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-40"></div>
        </div>
      </div>
    </div>
  );
};

export default function TeamShift() {
  return (
    <div className="pb-24">
      <FrappeListView<TeamShiftItem>
        doctype="Shift Assignment"
        ItemComponent={TeamShiftItemComponent}
        SkeletonComponent={TeamShiftSkeleton}
        isSearch={true}
        isFilter={false}
        showRefereshButton={true}
        infiniteScroll={true}
        defaultFilters={{}}
        defaultFields={[
          "name",
          "employee",
          "employee_name",
          "shift_type",
          "start_date",
          "end_date",
          "status",
          "modified",
        ]}
        searchFields={["employee_name", "shift_type"]}
        permissionErrorMessage="You don't have permission to view team shift assignments"
      />
    </div>
  );
}
