import { useCallback, useState } from "react";
import {
  MyPlannedAttendanceRequest,
} from "../../../types/attendance";
import LayoutHeader from "../../shared/LayoutHeader";
import { useNavigate, useSearchParams } from "react-router";
import ApprovalList from "../../shared/ApprovalList";
import CardTable from "../../shared/CardTable";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import OvertimeApprovalCard from "./OvertimeApprovalCard";
import { MyOvertimeDetails } from "./MyOvertimeRequestDetails";

const AllOvertimePendingRequests = () => {

  const [refetch, setRefetch] = useState(false);
  const { refetchAttendance } = useGlobalStore();

  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const requestId = searchParams.get("requestId");

  const handleRequestClick = useCallback(
  (request: any) => {
    if (request?.todo_id) {
      setSearchParams({ requestId: request.todo_id });
    }
  },
  [setSearchParams]
);

  const handleCloseModal = useCallback(() => {
      navigate(-1);
  }, [setSearchParams]);

    const handleActionComplete = useCallback(() => {
      setSearchParams({});
      // Trigger refetch after action
      setRefetch(true);
  }, [setSearchParams]);

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
                onClick={(request: MyPlannedAttendanceRequest) =>handleRequestClick(request)}
                loadingAction={item?.loadingAction}
              />
            )}
          />
        </CardTable>
      </div>
      {requestId && (
        <MyOvertimeDetails
          documentName={requestId}
          onClose={handleCloseModal}
          onAction={handleActionComplete}
        />
      )}
    </div>
  );
};

export default AllOvertimePendingRequests;
