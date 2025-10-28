import { useCallback, useState } from "react";
import ApprovalList from "../shared/ApprovalList";
import ApprovalRejectedForMobile from "./mobileUI/ApprovalRejectedCard";
import { ShiftDetailView } from "./ShiftDetailView";
import { useSearchParams } from "react-router-dom";

export default function ShiftChangeRequests() {
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
    setSearchParams({});
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
    <div className="bg-white ">
      <ApprovalList
        status="Draft"
        doctype={"Shift Request"}
        pageSize={10}
        refetch={refetchApprovalList}
        setRefetch={setRefetchApprovalList}
        onApprovalRefetchComplete={handleApprovalRefetchComplete}
        renderCardContent={(item) => (
          <ApprovalRejectedForMobile
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
      {requestId && (
              <ShiftDetailView
                documentName={requestId}
                onClose={ handleCloseModal}
                onAction={handleActionComplete}

              />
            )}
    </div>
  );
}
