import { Plus } from "lucide-react";
import DataListView from "../../DataListView";
import AttndanceRequestForm from "./AttendanceRequestForm";
import { useMemo, useState } from "react";
import EmpAttendanceRequestCard from "../Employee/EmpAttendanceRequestCard";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useScreenSize } from "../../../hooks/useScreenSize";
import CardTable from "../../shared/CardTable";
import { MyAttendanceRequest } from "../../../types/attendance";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useLocation } from "react-router-dom";

const AllAttendanceRequest = ({
  pageSize = 10,
  showPagination = true,
  showAttendanceRequest = true,
}: {
  pageSize?: number;
  showPagination?: boolean;
  showAttendanceRequest?: boolean;
}) => {
  const { isDesktop } = useScreenSize();
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();
  const location = useLocation();

  // Get status type from route path
  const statusType = location.pathname.includes("/actioned")
    ? "actioned"
    : "pending";

  const defaultFilters = useMemo(() => {
    if (!currentEmployee?.employee) return undefined;

    const baseFilters = { employee: currentEmployee?.employee };

    // Add status filter based on type
    if (statusType === "pending") {
      return { ...baseFilters, status: "Pending" };
    } else if (statusType === "actioned") {
      return { ...baseFilters, status: ["in", ["Rejected", "Approved"]] };
    }

    return baseFilters;
  }, [currentEmployee?.employee, statusType]);

  const [showForm, setShowForm] = useState(false);

  const CardSkeleton = () => (
    <div className="rounded-xl bg-gray-100 animate-pulse my-4">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between gap-1">
          <div>
            <div className="h-4 w-32 bg-gray-300 rounded mb-2"></div>
            <div className="h-3 w-24 bg-gray-300 rounded"></div>
          </div>
          <div className="h-6 w-16 bg-gray-300 rounded-md"></div>
        </div>
      </div>
    </div>
  );
  return (
    <>
      {showForm ? (
        <AttndanceRequestForm
          onClose={() => {
            setShowForm(false);
          }}
        />
      ) : (
        <div className="bg-white h-full px-4 pt-2 mb-32">
          <CardTable
            titles={
              statusType === "pending"
                ? ["Request Type", "From Date", "To Date", "Status", "Actions"]
                : ["Request Type", "From Date", "To Date", "Status"]
            }
          >
            <DataListView
              queryKey={["attendance-requests", statusType]}
              customAPI={{
                method: "cn_leave_shift_managment.api.get_open_approval_todos",
                params: {
                  doctype: "Attendance Request",
                  employee: currentEmployee?.employee,
                },
              }}
              defaultFilters={defaultFilters}
              ItemComponent={(props: { item: MyAttendanceRequest }) => {
                return (
                  <EmpAttendanceRequestCard
                    data={{
                      ...props?.item,
                    }}
                  />
                );
              }}
              SkeletonComponent={CardSkeleton}
              onItemClick={(data) => {
                console.log(data);
              }}
              onRefetchComplete={() => {
                setRefetchAttendance(false);
              }}
              refetchTrigger={refetchAttendance}
              isSearch={false}
              isFilter={false}
              pageSize={pageSize}
              showRefreshButton={false}
              orderBy="modified desc"
              infiniteScroll={false}
              loadMorePagination={true}
              showPagination={showPagination}
            />
          </CardTable>
        </div>
      )}

      {/* Add Attendance Request button - Only show for mobile since desktop has Actions button */}
      {!isDesktop && showAttendanceRequest && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-300 py-2">
          <div className="max-w-7xl mx-auto px-4">
            <button
              className="flex justify-center gap-2 w-full py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus /> <span>Add Attendance Request</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AllAttendanceRequest;
