import { useState } from "react";
import { AttendanceRequest } from "../../../types/attendance";
import { AttendanceDetailView } from "../AttendanceDetails";
import LayoutHeader from "../../shared/LayoutHeader";
import { useNavigate } from "react-router";
import ApprovalList from "../../shared/ApprovalList";
import ApprovalCard from "./ApprovalCard";
import CardTable from "../../shared/CardTable";
import { useGlobalStore } from "../../../hooks/useGlobalStore";

const AllPendingRequests = () => {
  const [selectedRequest, setSelectedRequest] =
    useState<AttendanceRequest | null>(null);
  const [refetch, setRefetch] = useState(false);

  const navigate = useNavigate();
  const { refetchAttendance } = useGlobalStore();

  return (
    <div>
      <LayoutHeader
        tab={"Pending Team Attendance Requests"}
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
            doctype={"Attendance Request"}
            pageSize={13}
            refetch={refetchAttendance || refetch}
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
                onClick={(request: any) => setSelectedRequest(request)}
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
        />
      )}
    </div>
  );
};

export default AllPendingRequests;
