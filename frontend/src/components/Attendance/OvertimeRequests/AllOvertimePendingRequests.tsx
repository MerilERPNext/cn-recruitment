import { useState } from "react";
import {
  LoadingAction,
  MyPlannedAttendanceRequest,
} from "../../../types/attendance";
import LayoutHeader from "../../shared/LayoutHeader";
import { useNavigate } from "react-router";
import ApprovalList from "../../shared/ApprovalList";
import CardTable from "../../shared/CardTable";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import OvertimeApprovalCard from "./OvertimeApprovalCard";
import { MyOvertimeDetails } from "./MyOvertimeRequestDetails";

const AllOvertimePendingRequests = () => {
  const [selectedRequest, setSelectedRequest] = useState<
    (MyPlannedAttendanceRequest & { loadingAction?: LoadingAction }) | null
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
          titles={[
            "Select",
            "Employee",
            "Description",
            "Due Date",
            "Status",
            "Actions",
          ]}
          columnWidths={["5%", "10%", "35%", "8%", "8%", "20%"]}
        >
          <ApprovalList
            doctype={"Planned Overtime Request"}
            refetch={refetch || refetchAttendance}
            onApprovalRefetchComplete={() => {
              setRefetch(false);
            }}
            status="Open"
            renderCardContent={(item) => (
              <OvertimeApprovalCard
                isSelected={item?.isSelected}
                onToggleSelect={item?.onToggleSelect}
                data={item?.data}
                onAction={item?.onAction}
                onClick={(request: MyPlannedAttendanceRequest) =>
                  setSelectedRequest(request)
                }
                loadingAction={item?.loadingAction}
              />
            )}
          />
        </CardTable>
      </div>
      {selectedRequest && (
        <MyOvertimeDetails
          data={selectedRequest as MyPlannedAttendanceRequest}
          onClose={() => setSelectedRequest(null)}
          onAction={() => {
            setSelectedRequest(null);
          }}
        />
      )}
    </div>
  );
};

export default AllOvertimePendingRequests;
