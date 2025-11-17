import { Plus } from "lucide-react";
import DataListView from "../../DataListView";
import AttndanceRequestForm from "./AttendanceRequestForm";
import { useState, useCallback } from "react";
import EmpAttendanceRequestCard from "../Employee/EmpAttendanceRequestCard";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useScreenSize } from "../../../hooks/useScreenSize";
import CardTable from "../../shared/CardTable";
import { MyAttendanceRequest } from "../../../types/attendance";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useNavigate } from "react-router-dom";
import { ViewAll } from "../../shared/atoms/ViewAll";
import Button from "../../shared/atoms/Button";

const STATUS_OPTIONS = [
  { label: "Pending", value: "Pending" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
  { label: "Cancelled", value: "Cancelled" },
];

const AttendanceRequest = ({
  pageSize = 10,
  showPagination = false,
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
  // 2. Add state for selected status
  const [selectedStatus, setSelectedStatus] = useState("Pending");
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();

  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  // Use useCallback to memoize the onRefetchComplete handler
  const handleRefetchComplete = useCallback(() => {
    setRefetchAttendance(false);
  }, [setRefetchAttendance]);

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

  // Handler for the dropdown change
  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(event.target.value);
    setRefetchAttendance(true); // Trigger refetch on filter change
  };

  // 3. Create the Dropdown Component
  const FilterDropdowns = () => (
    <div className="flex items-center gap-2">
      <select
        value={selectedStatus}
        onChange={handleStatusChange}
        className="border border-gray-300 rounded px-3 py-2 text-sm bg-gray-100"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
        <div>
          <div className="bg-white h-full px-4 pt-2">
            <div className="bg-white">
              <div className="bg-white px-2">
                {/* Pending */}

                <div className="flex justify-between pt-4 mb-2 border-b-1 border-gray-200">
                  <h2 className="module-title pb-1">My Attendance Requests</h2>

                  <div className="flex items-center space-x-3 pb-1">
                    <FilterDropdowns /> {/* Add the dropdown here */}
                    {/* <button
                      onClick={() => {
                        navigate(
                          "/webapp/attendance/attendance-request/pendings"
                        );
                      }}
                      className="text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                    >
                      View All
                    </button> */}
                    <ViewAll
                      title="View All"
                      onClick={() => {
                        navigate(
                          "/webapp/attendance/attendance-request/pendings"
                        );
                      }}
                    />
                  </div>
                </div>
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
                  {currentEmployee?.employee ? (
                    <DataListView
                      queryKey={["attendance-requests", selectedStatus]}
                      customAPI={{
                        method:
                          "cn_leave_shift_managment.api.get_open_approval_todos",
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
                  ) : (
                    <></>
                  )}
                </CardTable>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Attendance Request button - Only show for mobile since desktop has Actions button */}
      {!isDesktop && showAttendanceRequest && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-300 py-2">
          <div className="max-w-7xl mx-auto px-4">
            <Button
              bgColor="blue-600"
              size="lg"
              fullWidth
              className="hover:bg-blue-700"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus /> <span>Add Attendance Request</span>
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default AttendanceRequest;
