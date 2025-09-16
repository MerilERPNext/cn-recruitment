import { useMemo, useState } from "react";
import CardTable from "../../shared/CardTable";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useNavigate } from "react-router";
import { AttendanceRequest, LoadingAction } from "../../../types/attendance";
import { AttendanceDetailView } from "../AttendanceDetails";
import ApprovalList from "../../shared/ApprovalList";
import ApprovalCard from "../TeamAttendanceDetails/ApprovalCard";
import FrappeListView from "../../ListView";
import { RequestCard } from "../TeamAttendanceDetails/RequestCard";
import useCurrentUser from "../../../hooks/useCurrentUser";

const OvertimeRequests = () => {
  const { refetchAttendance } = useGlobalStore();
  const [refetch, setRefetch] = useState(false);
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();

  const defaultFilters = useMemo(
    () => ({
      allocated_to: currentUser?.name,
      status: ["in", ["Closed", "Cancelled"]],
    }),
    [currentUser]
  );
  const [selectedRequest, setSelectedRequest] = useState<
    (AttendanceRequest & { loadingAction?: LoadingAction }) | null
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
            titles={["Select", "Description", "Date", "Status", "Actions"]}
            columnWidths={["10%", "30%", "10%", "10%", "30%"]}
          >
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
          </CardTable>
        </div>
        {/* Actioned */}
        <div className="bg-white px-2 mt-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2 border-b-1 border-gray-200 pb-1">
              Actioned Planned Overtime Requests
            </h2>
            <CardTable
              columnWidths={["42%", "10%", "33%"]}
              titles={["Description", "Date", "Status"]}
            >
              <div>
                <FrappeListView
                  doctype="ToDo"
                  isSearch={false}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  defaultFilters={defaultFilters as any}
                  showRefereshButton={false}
                  infiniteScroll={false}
                  isFilter={false}
                  defaultFields={["*"]}
                  pageSize={3}
                  refetchTrigger={refetch || refetchAttendance}
                  onRefetchComplete={() => setRefetch(false)}
                  showPagination={false}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ItemComponent={(props: { item: any }) => {
                    return (
                      <RequestCard
                        key={props?.item?.name}
                        request={props?.item}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onClick={(request: any) => setSelectedRequest(request)}
                      />
                    );
                  }}
                />
              </div>
            </CardTable>
          </div>
        </div>
      </div>

      {selectedRequest && (
        <AttendanceDetailView
          data={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onAction={() => {
            setSelectedRequest(null);
            setRefetch(true);
          }}
          loadingAction={selectedRequest?.loadingAction}
        />
      )}
    </div>
  );
};

export default OvertimeRequests;
