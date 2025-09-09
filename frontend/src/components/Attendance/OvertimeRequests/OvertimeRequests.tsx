import { useState } from "react";
import CardTable from "../../shared/CardTable";
import ApprovalList from "../../shared/ApprovalList";
import ApprovalCard from "../TeamAttendanceDetails/ApprovalCard";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useNavigate } from "react-router";
import { AttendanceRequest, LoadingAction } from "../../../types/attendance";
import { AttendanceDetailView } from "../AttendanceDetails";

const OvertimeRequests = () => {
  const { refetchAttendance } = useGlobalStore();
  const [refetch, setRefetch] = useState(false);
  const navigate = useNavigate();

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
              Pending Requests
            </h2>
            <button
              onClick={() => {
                navigate(
                  "/webapp/attendance/team-attendance-requests/pendings"
                );
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View All
            </button>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 my-8 pb-1 text-center">
            --------------- In Progress ---------------
          </h2>
          <CardTable
            titles={[
              "Select",
              "Allocated To",
              "Description",
              "Date",
              "Status",
              "Actions",
            ]}
          >
            <ApprovalList
              doctype={"Planned Overtime Request"}
              pageSize={3}
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
