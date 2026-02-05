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
    [setSearchParams],
  );

  const handleCloseModal = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleActionComplete = useCallback(() => {
    setSearchParams({});
    // Trigger refetch after action
    setRefetchApprovalList(true);
  }, [setSearchParams]);

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const tableTitles = [
    "Select",
    "Employee",
    "Shift Type",
    "From Date",
    "To Date",
    "Due Date",
    "Status",
    "ACTIONS",
  ];

  const tableColumnWidths = [
    "0.5fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
  ];
  return (
    <div className="w-full mx-auto py-4 px-4">
      <div>
        <HeaderBar
          title="Team Shift Requests"
          className="mb-3"
          onBack={() => navigate(-1)}
        />
        <CardTable titles={tableTitles} columnWidths={tableColumnWidths}>
          <ApprovalList
            status="Draft"
            doctype={"Shift Request"}
            refetch={refetchApprovalList}
            setRefetch={setRefetchApprovalList}
            onApprovalRefetchComplete={handleApprovalRefetchComplete}
            columnWidths={tableColumnWidths}
            renderCardContent={(item) => (
              <ApprovalRejectionQueue
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
