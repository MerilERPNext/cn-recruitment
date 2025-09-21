import HeaderBar from "../HeaderBar";
import { useNavigate } from "react-router-dom";

import ApprovalList from "../shared/ApprovalList";
import ApprovalRejectionQueue from "./dashboard/ApprovalRejection";
import { useState } from "react";
import { useGlobalStore } from "../../hooks/useGlobalStore";

const AllShiftChangeRequestsList: React.FC = () => {
  const navigate = useNavigate();
  const [refetch, setRefetch] = useState(false);
  const { refetchAttendance } = useGlobalStore();

  return (
    <div className="w-full mx-auto ">
      <HeaderBar
        title="All Shift Change Requests"
        onBack={() => navigate(-1)}
      />
      <div className="overflow-x-auto mt-6 mx-6 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="table-header grid grid-cols-7 gap-4">
          <span className="table-header-text flex items-center">SELECT</span>
          <span className="table-header-text flex items-center justify-start">
            EMPLOYEE NAME
          </span>
          <span className="table-header-text flex items-center justify-start">
            CREATION DATE
          </span>
          <span className="table-header-text flex items-center justify-start">
            STATUS
          </span>
          <span className="table-header-text flex items-center justify-start">
            START DATE
          </span>
          <span className="table-header-text flex items-center justify-start">
            END DATE
          </span>
          <span className="table-header-text flex items-center justify-start">
            ACTIONS
          </span>
        </div>
        
        <div className="divide-y divide-gray-200">
          <ApprovalList
            doctype={"Shift Request"}
            pageSize={10}
            refetch={refetchAttendance || refetch}
            onApprovalRefetchComplete={() => setRefetch(false)}
            renderCardContent={(item) => (
              <ApprovalRejectionQueue
                isSelected={item?.isSelected}
                onToggleSelect={item?.onToggleSelect}
                data={item?.data}
                onAction={item?.onAction}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default AllShiftChangeRequestsList;
