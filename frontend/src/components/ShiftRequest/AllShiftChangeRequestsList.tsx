import HeaderBar from "../HeaderBar";
import { useNavigate, useSearchParams } from "react-router-dom";

import ApprovalList from "../shared/ApprovalList";
import ApprovalRejectionQueue from "./dashboard/ApprovalRejection";
import { useCallback, useState } from "react";
import CardTable from "../shared/CardTable";
import { ShiftDetailView } from "./ShiftDetailView";

const AllShiftChangeRequestsList: React.FC = () => {
  const navigate = useNavigate();

  const [refetchApprovalList, setRefetchApprovalList] = useState(false);

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
    setRefetchApprovalList(true);
  }, [setSearchParams]);

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  return (
    <div className="w-full mx-auto pt-2 px-6">
      <div>
        <HeaderBar
          title="All Shift Change Requests"
          onBack={() => navigate(-1)}
        />
        <CardTable
          titles={[
            "Select",
            "Employee",
            "Shift Type",
            "From Date",
            "To Date",
            "Due Date",
            "Status",
            "Actions",
          ]}
          columnWidths={[
            "8%",
            "10%",
            "10%",
            "10%",
            "10%",
            "10%",
            "10%",
            "20%",
          ]}
        >
          <ApprovalList
            status="Draft"
            doctype={"Shift Request"}
            refetch={refetchApprovalList}
            setRefetch={setRefetchApprovalList}
            onApprovalRefetchComplete={handleApprovalRefetchComplete}
            renderCardContent={(item) => (
              <ApprovalRejectionQueue
                isSelected={item?.isSelected}
                onToggleSelect={item?.onToggleSelect}
                data={item?.data}
                onAction={item?.onAction}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(request: any) =>handleRequestClick(request)}
                loadingAction={item?.loadingAction}
              />
            )}
          />
        </CardTable>
      </div>

      {requestId && (
        <ShiftDetailView
          documentName={requestId}
          onClose={handleCloseModal}
          onAction={handleActionComplete}
        />
      )}
    </div>
  );
};

export default AllShiftChangeRequestsList;
