import { useMemo, useState } from "react";
import FrappeListView from "../ListView";
import ApprovalCard from "../Attendance/TeamAttendanceDetails/ApprovalCard";
import { RequestCard } from "../Attendance/TeamAttendanceDetails/RequestCard";
import { useNavigate } from "react-router";
import ApprovalList from "../shared/ApprovalList";
import CardTable from "../shared/CardTable";
import { LeaveDetailView } from "./LeaveDetails";
import useCurrentUser from "../../hooks/useCurrentUser";
import { useGlobalStore } from "../../hooks/useGlobalStore";

type LoadingAction = {
  id: string;
  action: string;
};

const TeamLeaveRequest = () => {
  const { data: currentUser } = useCurrentUser();
  const defaultFilters = useMemo(
    () => ({
      reference_type: "Leave Application",
      allocated_to: currentUser?.name,
      status: ["in", ["Closed", "Cancelled"]],
    }),
    [currentUser]
  );
  const { refetchAttendance } = useGlobalStore();
  const [refetch, setRefetch] = useState(false);
  const navigate = useNavigate();
  const [selectedRequest, setSelectedRequest] = useState<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (any & { loadingAction?: LoadingAction }) | null
  >(null);
  return (
    <>
      <div className="bg-white min-h-full w-full">
        <div className="bg-white w-full px-2">
          <div className="flex justify-between pt-4 mb-2 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 pb-1">
              Pending Requests
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
            titles={["Select", "Description", "Due Date", "Status", "Actions"]}
            columnWidths={["10%", "30%", "10%", "10%", "30%"]}
          >
            <ApprovalList
              doctype="Leave Application"
              refetch={refetch || refetchAttendance}
              onApprovalRefetchComplete={() => setRefetch(false)}
              showPagination={false}
              renderCardContent={(item) => (
                <ApprovalCard
                  isSelected={item?.isSelected}
                  onToggleSelect={item?.onToggleSelect}
                  data={item?.data}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onAction={async (action: string, data: any) => {
                    await item?.onAction?.(action, data);
                    setSelectedRequest(null);
                    setRefetch(true);
                  }}
                  loadingAction={item?.loadingAction}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={(request: any) =>
                    setSelectedRequest({
                      ...request,
                      loadingAction: item?.loadingAction,
                    })
                  }
                />
              )}
            />
          </CardTable>
        </div>

        <div className="bg-white mt-4 md:px-2">
          <h2 className="text-lg px-2 md:px-0 font-semibold text-gray-800 mb-2 border-b border-gray-200 pb-1">
            Actioned Requests
          </h2>

          <CardTable
            titles={["Description", "Due Date", "Status"]}
            columnWidths={["42%", "10%", "33%"]}
          >
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
              showPagination={false}
              refetchTrigger={refetch}
              onRefetchComplete={() => setRefetch(false)}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ItemComponent={({ item }: { item: any }) => (
                <RequestCard
                  key={item?.name}
                  request={item}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={(request: any) => setSelectedRequest(request)}
                />
              )}
            />
          </CardTable>
        </div>
      </div>
      {selectedRequest && (
        <LeaveDetailView
          data={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onAction={() => {
            setSelectedRequest(null);
            setRefetch(true);
          }}
          loadingAction={selectedRequest?.loadingAction}
        />
      )}
    </>
  );
};

export default TeamLeaveRequest;
