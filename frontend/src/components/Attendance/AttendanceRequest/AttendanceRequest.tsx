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
import Button from "../../shared/atoms/Button";
import { useTargetUser } from "../../../context/ViewedUserContext";
import AttendanceRequestFormV2 from "./AttendanceRequestFormV2";
import { Typography } from "../../shared/atoms/Typography";

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
    currentUser?.name as string,
  );
  const { targetEmployeeId } = useTargetUser();
  const effectiveEmployeeId = targetEmployeeId || currentEmployee?.employee;
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
          <div className="min-h-screen">
            <div className="px-4">
              <div className="flex justify-between items-center pt-4 mb-2 border-b border-gray-200 px-2">
                <div className="flex flex-col mb-2">
                  <Typography variant="h4">My Attendance Requests</Typography>
                  <Typography variant="bodySmall" color="body2">
                    Track and manage your attendance requests
                  </Typography>
                </div>
              </div>
              <CardTable
                titles={[
                  "Request Type",
                  "From Date",
                  "To Date",
                  "Duration",
                  "Due Date",
                  "Allocated To",
                  "Status",
                  "Actions",
                ]}
              >
                {effectiveEmployeeId ? (
                  <DataListView
                    queryKey={["attendance-requests", effectiveEmployeeId]}
                    customAPI={{
                      method:
                        "cn_leave_shift_managment.api.get_open_approval_todos",
                      params: {
                        doctype: "Attendance Request",
                        employee: effectiveEmployeeId,
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
                        fieldname: "custom_request_type",
                        label: "Request Type",
                        fieldtype: "Select",
                        options: [
                          "Attendance Adjustment",
                          "Short Attendance Request",
                          "Out Duty",
                          "Clockin",
                        ],
                      },
                    ]}
                    defaultFilters={{
                      status: "Pending",
                    }}
                  />
                ) : (
                  <></>
                )}
              </CardTable>
            </div>
          </div>
        </div>
      )}

      {/* Add Attendance Request button - Only show for mobile since desktop has Actions button */}
      {!isDesktop && showAttendanceRequest && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-300 py-2">
          <div className="max-w-7xl mx-auto px-4">
            <Button
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
