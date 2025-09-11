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
        tab={"Pending Planned Overtime Attendants"}
        onBack={() => {
          navigate(-1);
        }}
      />
      <div className="p-2">
        <CardTable
          titles={[
            "Select",
            "Allocated To",
            "Description",
            "Date",
            "Status",
            "Actions",
          ]}
          columnWidths={["40px", "160px", "0.8fr", "120px", "140px", "0.6fr"]}
        >
          <ApprovalList
            doctype={"Planned Overtime Request"}
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

export default AllOvertimePendingRequests;
