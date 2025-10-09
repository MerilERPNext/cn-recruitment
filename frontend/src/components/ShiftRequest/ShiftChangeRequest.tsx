import { useCallback, useState } from "react";
import ApprovalList from "../shared/ApprovalList";
import ApprovalRejectedForMobile from "./mobileUI/ApprovalRejectedCard";
import { MyShiftRequest } from "../../types/shift";
import { ShiftDetailView } from "./ShiftDetailView";
type LoadingAction = {
  id: string;
  action: string;
};

export default function ShiftChangeRequests() {
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  
    const handleApprovalRefetchComplete = useCallback(() => {
      setRefetchApprovalList(false);
    }, []);
  
    const [selectedRequest, setSelectedRequest] = useState<
      (MyShiftRequest & { loadingAction?: LoadingAction }) | null
    >(null);
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
            onClick={(request: any) =>
              setSelectedRequest({
                ...request,
                loadingAction: item?.loadingAction,
              })
            }
            loadingAction={item?.loadingAction}
          />
        )}
      />
      {selectedRequest && (
              <ShiftDetailView
                data={selectedRequest}
                onClose={() => setSelectedRequest(null)}
                onAction={() => {
                  setSelectedRequest(null);
                }}
              />
            )}
    </div>
  );
}
