import { useState } from "react";
import { AttendanceRequest } from "../../types/attendance";
import { AttendanceDetailView } from "../Attendance/AttendanceDetails";
import LayoutHeader from "../shared/LayoutHeader";
import ApprovalList from "../shared/ApprovalList";
import { useNavigate } from "react-router";
import ApprovalCard from "../Attendance/TeamAttendanceDetails/ApprovalCard";
import CardTable from "../shared/CardTable";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import { IoChevronBackOutline } from "react-icons/io5";
import { useScreenSize } from "../../hooks/useScreenSize";

const PendingTeamLeaves = () => {
  const [selectedRequest, setSelectedRequest] =
    useState<AttendanceRequest | null>(null);
  const [refetch, setRefetch] = useState(false);

  const navigate = useNavigate();
  const { refetchAttendance } = useGlobalStore();
  const { isDesktop } = useScreenSize();

  return (
    <div>
      <LayoutHeader
        tab={"Pending Team Attendance Requests"}
        onBack={() => {
          navigate(-1);
        }}
      />
      {isDesktop && (
        <div className="flex justify-between items-center p-4">
          <button onClick={() => navigate(-1)}>
            <IoChevronBackOutline />
          </button>
          <h4 className="font-semibold">Pending Requests</h4>
          <div></div>
        </div>
      )}

      <div className="p-4 pt-0">
        <CardTable
          titles={[
            "Select",
            "Name",
            "Employeee",
            "From Date",
            "To Date",
            "Due Date",
            "Status",
            "Actions",
          ]}
          columnWidths={["5%", "15%", "10%", "8%", "8%", "8%", "10%", "20%"]}
        >
          <ApprovalList
            doctype={"Leave Application"}
            status="Open"
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

export default PendingTeamLeaves;
