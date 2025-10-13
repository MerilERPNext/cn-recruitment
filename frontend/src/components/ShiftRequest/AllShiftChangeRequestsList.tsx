import HeaderBar from "../HeaderBar";
import { useNavigate } from "react-router-dom";

import ApprovalList from "../shared/ApprovalList";
import ApprovalRejectionQueue from "./dashboard/ApprovalRejection";
import { useCallback, useState } from "react";
import CardTable from "../shared/CardTable";
import { MyShiftRequest } from "../../types/shift";
import { ShiftDetailView } from "./ShiftDetailView";

type LoadingAction = {
  id: string;
  action: string;
};

const AllShiftChangeRequestsList: React.FC = () => {
  const navigate = useNavigate();

  const [refetchApprovalList, setRefetchApprovalList] = useState(false);

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const [selectedRequest, setSelectedRequest] = useState<
    (MyShiftRequest & { loadingAction?: LoadingAction }) | null
  >(null);

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
            "Id",
            "Employee",
            "Shift Type",
            "Status",
            "From Date",
            "To Date",
            "Actions",
          ]}
          columnWidths={["5%", "15%", "10%", "8%", "8%", "8%", "10%", "20%"]}
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
        </CardTable>
      </div>

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
};

export default AllShiftChangeRequestsList;
