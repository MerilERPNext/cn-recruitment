import { Plus } from "lucide-react";
import DataListView from "../../DataListView";
import { useState, useCallback } from "react";
import EmpAttendanceRequestCard from "../Employee/EmpAttendanceRequestCard";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useScreenSize } from "../../../hooks/useScreenSize";
import CardTable from "../../shared/CardTable";
import { MyAttendanceRequest } from "../../../types/attendance";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import CustomDropdown from "../../shared/CustomDropdown";
import Button from "../../shared/atoms/Button";
import AttendanceRequestFormV2 from "./AttendanceRequestFormV2";

const STATUS_OPTIONS = [
  { label: "Pending", value: "Pending" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
];

const AttendanceRequest = ({
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
  const [selectedStatus, setSelectedStatus] = useState("Pending");
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();

  const [showForm, setShowForm] = useState(false);

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

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(event.target.value);
    setRefetchAttendance(true);
  };

  const FilterDropdowns = () => (
    <div className="flex items-center gap-2">
      <CustomDropdown
        value={selectedStatus}
        onChange={handleStatusChange}
        options={STATUS_OPTIONS}
      />
    </div>
  );

  return (
    <>
      {showForm ? (
        <AttendanceRequestFormV2
          onClose={() => {
            setShowForm(false);
          }}
        />
      ) : (
        <div>
          <div className="bg-white h-full px-4 pt-2">
            <div className="bg-white">
              <div className="bg-white px-2">
                <div className="flex justify-between items-center pt-4 mb-2 border-b-1 border-gray-200">
                  <h2 className="base-title md:module-title pb-1">
                    My Attendance Requests
                  </h2>

                  <div className="flex items-center space-x-3 pb-1">
                    <FilterDropdowns />
                  </div>
                </div>
                <CardTable
                  titles={[
                    "Request Type",
                    "From Date",
                    "To Date",
                    "Due Date",
                    "Allocated To",
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
                      pageSize={pageSize}
                      showRefreshButton={false}
                      orderBy="modified desc"
                      showPagination={showPagination}
                      infiniteScroll={true}
                      loadMorePagination={false}
                      isSearch={true}
                      isFilter={true}
                      filterFields={[
                        {
                          fieldname: "status",
                          label: "Status",
                          fieldtype: "Select",
                          options: ["Pending", "Approved", "Rejected"],
                        },
                        {
                          fieldname: "allocated_to",
                          label: "Allocated to",
                          fieldtype: "Data",
                        },
                        {
                          fieldname: "due_date",
                          label: "Due Date",
                          fieldtype: "Date",
                        },
                      ]}
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
