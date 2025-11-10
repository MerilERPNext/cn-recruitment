import { Plus } from "lucide-react";
import DataListView from "../../DataListView";
import AttndanceRequestForm from "./AttendanceRequestForm";
import { useCallback, useState } from "react";
import EmpAttendanceRequestCard from "../Employee/EmpAttendanceRequestCard";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useScreenSize } from "../../../hooks/useScreenSize";
import CardTable from "../../shared/CardTable";
import { MyAttendanceRequest } from "../../../types/attendance";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useNavigate } from "react-router-dom";
import LayoutHeader from "../../shared/LayoutHeader";
import HeaderBar from "../../HeaderBar";

const ALL_STATUS_OPTIONS = [
  { label: "Pending", value: "Pending" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
  { label: "Cancelled", value: "Cancelled" },
];

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

  const [selectedStatus, setSelectedStatus] = useState("Pending");

  // Use useCallback to memoize the onRefetchComplete handler
  const handleRefetchComplete = useCallback(() => {
    setRefetchAttendance(false);
  }, [setRefetchAttendance]);

  // Handler for the dropdown change
  const handleStatusChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedStatus(event.target.value);
      setRefetchAttendance(true); // Trigger refetch on filter change
    },
    [setRefetchAttendance]
  );

  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

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

  // 5. Create the Filter Dropdown Component
  const FilterDropdowns = () => (
    <div className="flex items-center gap-2">
      <select
        value={selectedStatus}
        onChange={handleStatusChange}
        className="border border-gray-300 rounded px-3 py-2 text-sm bg-gray-100"
      >
        {ALL_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <>
      <LayoutHeader
        tab={`My Attendance Requests`}
        onBack={() => {
          navigate(-1);
        }}
        children={<FilterDropdowns />}
      />

      {isDesktop && (
        <HeaderBar
          title={"My Attendance Requests"}
          onBack={() => navigate(-1)}
          rightSlot={<FilterDropdowns />}
        ></HeaderBar>
      )}

      {showForm ? (
        <AttndanceRequestForm
          onClose={() => {
            setShowForm(false);
          }}
        />
      ) : (
        <div className="bg-white h-full px-4 pt-2 mb-32">
          <CardTable
            titles={[
              "Allocated To",
              "Request Type",
              "From Date",
              "To Date",
              "Due Date",
              "Status",
              "Actions",
            ]}
          >
            <DataListView
              queryKey={["attendance-requests", selectedStatus]}
              customAPI={{
                method: "cn_leave_shift_managment.api.get_open_approval_todos",
                params: {
                  doctype: "Attendance Request",
                  employee: currentEmployee?.employee,
                  status: selectedStatus,
                },
              }}
              ItemComponent={(props: { item: MyAttendanceRequest }) => {
                return (
                  <EmpAttendanceRequestCard
                    type="pending"
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
              onRefetchComplete={handleRefetchComplete}
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
