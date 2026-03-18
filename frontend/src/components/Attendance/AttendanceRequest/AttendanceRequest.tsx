import { useCallback, useState } from "react";
import { useTargetUser } from "../../../context/ViewedUserContext";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { MyAttendanceRequest } from "../../../types/attendance";
import DataListView from "../../DataListView";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import CardTable from "../../shared/CardTable";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import EmpAttendanceRequestCard from "../Employee/EmpAttendanceRequestCard";
import AttendanceRequestFormV2 from "./AttendanceRequestFormV2";

const AttendanceRequest = ({
  pageSize = 10,
  showAttendanceRequest = true,
}: {
  pageSize?: number;
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

  return (
    <>
      {showForm ? (
        <AttendanceRequestFormV2
          onClose={() => {
            setShowForm(false);
          }}
        />
      ) : (
        <div className="flex flex-col h-full">
          {isDesktop && (
            <div className="flex-shrink-0">
              <div className="px-6 py-1 md:py-4">
                <Typography variant="h4">My Attendance Requests</Typography>
                <Typography variant="bodySmall" color="body2">
                  Track and manage your attendance requests
                </Typography>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto md:px-4 pb-20">
            <CardTable
              columnWidths={[
                "1.5fr",
                "1fr",
                "1fr",
                "1fr",
                "1fr",
                "1fr",
                "1fr",
                "1fr",
              ]}
              titles={[
                "Request Type",
                "From Date",
                "To Date",
                "Due Date",
                "Duration",
                "Allocated To",
                "Status",
                "ACTIONS",
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
                  orderBy="from_date desc"
                  infiniteScroll={false}
                  loadMorePagination={false}
                  showPagination={true}
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
                  defaultFilters={{}}
                />
              ) : (
                <></>
              )}
            </CardTable>
          </div>
          {!isDesktop && showAttendanceRequest && (
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-300 py-2">
              <div className="max-w-7xl mx-auto px-4">
                <Button
                  size="lg"
                  fullWidth
                  className="hover:bg-blue-700"
                  onClick={() => setShowForm(!showForm)}
                >
                  <span>+ Attendance Request</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default AttendanceRequest;
