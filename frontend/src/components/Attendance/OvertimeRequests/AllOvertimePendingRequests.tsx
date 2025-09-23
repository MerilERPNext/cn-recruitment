import { useState } from "react";
import { AttendanceRequest } from "../../../types/attendance";
import { AttendanceDetailView } from "../AttendanceDetails";
import LayoutHeader from "../../shared/LayoutHeader";
import { useNavigate } from "react-router";
import ApprovalList from "../../shared/ApprovalList";
import CardTable from "../../shared/CardTable";
import ApprovalCard from "../TeamAttendanceDetails/ApprovalCard";

const AllOvertimePendingRequests = () => {
  const [selectedRequest, setSelectedRequest] =
    useState<AttendanceRequest | null>(null);
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
          columnWidths={["10%", "30%", "10%", "10%", "30%"]}
        >
          <ApprovalList
            doctype={"Planned Overtime Request"}
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
        />
      )}
    </div>
  );
};

export default AllOvertimePendingRequests;
