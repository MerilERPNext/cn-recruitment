import { useMemo, useState } from "react";
import CardTable from "../../shared/CardTable";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useNavigate } from "react-router";
import {
  AttendanceRequest,
  LoadingAction,
  MyPlannedAttendanceRequest,
} from "../../../types/attendance";
import { AttendanceDetailView } from "../AttendanceDetails";
import ApprovalList from "../../shared/ApprovalList";
import ApprovalCard from "../TeamAttendanceDetails/ApprovalCard";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import DataListView from "../../DataListView";
import { MyOvertimeDetails } from "./MyOvertimeRequestDetails";
import { MyRequestCard } from "./MyRequestCard";

const OvertimeRequests = () => {
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();
  const [refetch, setRefetch] = useState(false);
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
  const defaultFilters = useMemo(
    () => ({
      reference_type: "Planned Overtime Request",
      employee: currentEmployee?.employee,
    }),
    [currentEmployee]
  );
  const [selectedRequest, setSelectedRequest] = useState<
    (AttendanceRequest & { loadingAction?: LoadingAction }) | null
  >(null);
  const [mySelectedRequest, setMySelectedRequest] = useState<
    (MyPlannedAttendanceRequest & { loadingAction?: LoadingAction }) | null
  >(null);
  return (
    <div>
      <div className="bg-white min-h-screen">
        <div className="bg-white px-2">
          {/* Pending */}

          <div className="flex justify-between pt-4 mb-2 border-b-1 border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 pb-1">
              Pending Planned Overtime Requests
            </h2>
            <button
              onClick={() => {
                navigate(
                  "/webapp/attendance/planned-overtime-requests/pendings"
                );
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View All
            </button>
          </div>

          <CardTable
            titles={["Select", "Description", "Due Date", "Status", "Actions"]}
            columnWidths={["15%", "30%", "10%", "10%", "30%"]}
          >
            {currentUser?.name ? (
              <ApprovalList
                doctype={"Planned Overtime Request"}
                pageSize={3}
                showPagination={false}
                refetch={refetch || refetchAttendance}
                onApprovalRefetchComplete={() => {
                  setRefetch(false);
                }}
                renderCardContent={(item) => (
                  <ApprovalCard
                    isSelected={item?.isSelected}
                    onToggleSelect={item?.onToggleSelect}
                    data={item?.data}
                    onAction={item?.onAction}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onClick={(request: any) =>
                      setSelectedRequest({
                        ...request,
                        loadingAction: item?.loadingAction,
                      })
                    }
                    loadingAction={item?.loadingAction}
                  />
                )}
              />
            ) : null}
          </CardTable>
        </div>
        {/* Employee Requests */}
        <div className="bg-white px-2 mt-4">
          <div>
            <div className="flex justify-between pt-4 mb-2 border-b-1 border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 pb-1">
                My Planned Overtime Requests
              </h2>
              <button
                onClick={() => {
                  navigate(
                    "/webapp/attendance/planned-overtime-requests/my-overtime-requests"
                  );
                }}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View All
              </button>
            </div>
            <CardTable
              columnWidths={["15% 30%", "10%", "33%"]}
              titles={["Allocated To", "Description", "Due Date", "Status"]}
            >
              <DataListView
                queryKey="planned-overtime-request"
                customAPI={{
                  method:
                    "cn_leave_shift_managment.api.get_open_approval_todos",
                  params: {
                    doctype: "Planned Overtime Request",
                    employee: currentEmployee?.employee,
                  },
                }}
                defaultFilters={defaultFilters}
                ItemComponent={(props: {
                  item: MyPlannedAttendanceRequest;
                }) => {
                  return (
                    <MyRequestCard
                      request={props?.item}
                      onClick={(request: MyPlannedAttendanceRequest) =>
                        setMySelectedRequest(request)
                      }
                    />
                  );
                }}
                // SkeletonComponent={CardSkeleton}
                onItemClick={() => {
                  // Handle item click if needed
                }}
                onRefetchComplete={() => {
                  setRefetchAttendance(false);
                }}
                refetchTrigger={refetchAttendance}
                isSearch={false}
                isFilter={false}
                pageSize={5}
                showRefreshButton={false}
                orderBy="modified desc"
                infiniteScroll={false}
                loadMorePagination={true}
                showPagination={false}
              />
            </CardTable>
          </div>
        </div>
      </div>

      {selectedRequest && (
        <AttendanceDetailView
          label="Planned Overtime Request"
          data={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onAction={() => {
            setSelectedRequest(null);
            setRefetch(true);
          }}
          loadingAction={selectedRequest?.loadingAction}
        />
      )}

      {mySelectedRequest && (
        <MyOvertimeDetails
          data={mySelectedRequest as MyPlannedAttendanceRequest}
          onClose={() => setMySelectedRequest(null)}
        />
      )}
    </div>
  );
};

export default OvertimeRequests;
