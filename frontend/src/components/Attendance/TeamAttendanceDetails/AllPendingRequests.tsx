import { useState, useCallback } from "react";
import { AttendanceRequest } from "../../../types/attendance";
import { AttendanceDetailView } from "../AttendanceDetails";
import LayoutHeader from "../../shared/LayoutHeader";
import { useNavigate, useSearchParams } from "react-router";
import ApprovalList from "../../shared/ApprovalList";
import ApprovalCard from "./ApprovalCard";
import CardTable from "../../shared/CardTable";

const AllPendingRequests = () => {
  const [refetch, setRefetch] = useState(false);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const requestId = searchParams.get("requestId");

  const handleRequestClick = useCallback(
    (request: AttendanceRequest) => {
      if (request?.todo_id) {
        setSearchParams({ requestId: request.todo_id });
      }
    },
    [setSearchParams]
  );

  const handleCloseModal = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleActionComplete = useCallback(() => {
    setSearchParams({});
    // Trigger refetch after action
    setRefetch(true);
  }, [setSearchParams]);

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
          titles={[
            "Select",
            "Employee",
            "Explanation",
            "From Date",
            "To Date",
            "Due Date",
            "Status",
            "Actions",
          ]}
          columnWidths={["5%", "10%", "15%", "8%", "8%", "8%", "10%", "20%"]}
        >
          <ApprovalList
            doctype={"Attendance Request"}
            pageSize={13}
            refetch={refetch}
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
                onClick={(request: any) => handleRequestClick(request)} 
                loadingAction={item?.loadingAction}
              />
            )}
          />
        </CardTable>
      </div>

      {requestId && (
        <AttendanceDetailView
          documentName={requestId}
          onClose={handleCloseModal}
          onAction={handleActionComplete}
        />
      )}
    </div>
  );
};

export default AllPendingRequests;
