import { useState } from "react";
import { AttendanceRequest, LoadingAction } from "../../../types/attendance";
import { AttendanceDetailView } from "../AttendanceDetails";
import LayoutHeader from "../../shared/LayoutHeader";
import { useNavigate } from "react-router";
import ApprovalList from "../../shared/ApprovalList";
import CardTable from "../../shared/CardTable";
import ApprovalCard from "../TeamAttendanceDetails/ApprovalCard";
import { useGlobalStore } from "../../../hooks/useGlobalStore";

const AllOvertimePendingRequests = () => {
  const [selectedRequest, setSelectedRequest] = useState<
    (AttendanceRequest & { loadingAction?: LoadingAction }) | null
  >(null);
  const [refetch, setRefetch] = useState(false);
  const { refetchAttendance } = useGlobalStore();

  const navigate = useNavigate();
  return (
    <div>
      <LayoutHeader
        tab={"Pending Planned Overtime Requests"}
        onBack={() => {
          navigate(-1);
        }}
      />
      <div className="p-2">
        <CardTable
          titles={["Select", "Description", "Date", "Status", "Actions"]}
          columnWidths={["15%", "30%", "10%", "10%", "30%"]}
        >
          <ApprovalList
            doctype={"Planned Overtime Request"}
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
                onClick={(request: AttendanceRequest) =>
                  setSelectedRequest(request)
                }
                loadingAction={item?.loadingAction}
              />
            )}
          />
        </CardTable>
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

export default AllOvertimePendingRequests;
