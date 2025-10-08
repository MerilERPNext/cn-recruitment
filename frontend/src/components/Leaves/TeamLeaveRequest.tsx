import { useState, useCallback } from "react";
import { RequestCard } from "../Attendance/TeamAttendanceDetails/RequestCard";
import { MyAttendanceRequest } from "../../types/attendance";
import { AttendanceDetailView } from "../Attendance/AttendanceDetails";
import { useNavigate } from "react-router";
import ApprovalList from "../shared/ApprovalList";
import ApprovalCard from "../Attendance/TeamAttendanceDetails/ApprovalCard";
import CardTable from "../shared/CardTable";
import useCurrentUser from "../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import DataListView from "../DataListView";

type LoadingAction = {
  id: string;
  action: string;
};
const TeamLeaveRequest = () => {
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );

  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const [refetchActionedList, setRefetchActionedList] = useState(false);
  const navigate = useNavigate();

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
    setRefetchActionedList(true);
  }, []);

  const handleActionedRefetchComplete = useCallback(() => {
    setRefetchActionedList(false);
  }, []);

  const [selectedRequest, setSelectedRequest] = useState<
    (MyAttendanceRequest & { loadingAction?: LoadingAction }) | null
  >(null);

  return (
    <>
      <div className="bg-white min-h-screen">
        <div className="bg-white px-2">
          {/* Pending */}

          <div className="flex justify-between pt-4 mb-2 border-b-1 border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 pb-1">
              Pending Team Leave Requests
            </h2>
            <button
              onClick={() => {
                navigate("/webapp/leave-app/leave-requests/pending");
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View All
            </button>
          </div>
          <CardTable
            titles={[
              "Select",
              "Name",
              "Employee",
              "From Date",
              "To Date",
              "Due Date",
              "Status",
              "Actions",
            ]}
            columnWidths={["5%", "15%", "10%", "8%", "8%", "8%", "10%", "20%"]}
          >
            {currentUser?.name ? (
              <ApprovalList
                doctype={"Leave Application"}
                status="Open"
                refetch={refetchApprovalList}
                setRefetch={setRefetchApprovalList}
                onApprovalRefetchComplete={handleApprovalRefetchComplete}
                pageSize={3}
                showPagination={false}
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

        {/* Actioned */}
        <div className="bg-white px-2 mt-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2 border-b-1 border-gray-200 pb-1">
              Actioned Team Leave Requests
            </h2>
            <CardTable
              columnWidths={["15%", "15%", "8%", "8%", "8%", "20%"]}
              titles={[
                "Name",
                "Employee",
                "From Date",
                "To Date",
                "Due Date",
                "Status",
              ]}
            >
              {currentEmployee?.employee ? (
                <DataListView
                  queryKey="attendance-request"
                  customAPI={{
                    method:
                      "cn_leave_shift_managment.api.get_open_approval_todos",
                    params: {
                      doctype: "Leave Application",
                      is_allocated_todos: true,

                      fields: ["*"],
                    },
                  }}
                  defaultFilters={{ status: ["!=", "Open"] }}
                  ItemComponent={(props: { item: MyAttendanceRequest }) => {
                    return (
                      <RequestCard
                        request={props?.item}
                        onClick={(request: MyAttendanceRequest) =>
                          setSelectedRequest(request)
                        }
                      />
                    );
                  }}
                  onRefetchComplete={handleActionedRefetchComplete}
                  refetchTrigger={refetchActionedList}
                  isSearch={false}
                  isFilter={false}
                  pageSize={5}
                  showRefreshButton={false}
                  orderBy="modified desc"
                  infiniteScroll={false}
                  loadMorePagination={true}
                  showPagination={false}
                />
              ) : null}
            </CardTable>
          </div>
        </div>
      </div>

      {selectedRequest && (
        <AttendanceDetailView
          label="Leave Application"
          data={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onAction={() => {
            setSelectedRequest(null);
          }}
        />
      )}
    </>
  );
};

export default TeamLeaveRequest;
