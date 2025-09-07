import HeaderBar from "../HeaderBar";
import { useNavigate } from "react-router-dom";

import ApprovalList from "../shared/ApprovalList";
import ApprovalRejectionQueue from "./dashboard/ApprovalRejection";

const AllShiftChangeRequestsList: React.FC = () => {
    const navigate = useNavigate();



    return (
        <div className="w-full mx-auto ">
            <HeaderBar
                title="All Shift Change Requests"
                onBack={() => navigate(-1)}
            />

            {/* Table */}
            <div className="overflow-x-auto mt-6 mx-6 rounded-lg border border-gray-200 bg-white shadow-sm">
                {/* Header */}
                <div className="grid grid-cols-7  gap-4 px-6 h-12 bg-gray-50 border-b border-gray-200">
                <span className="font-semibold text-xs text-gray-500 flex items-center">
                   SELECT
                  </span>
                    <span className="text-xs font-bold text-gray-500 flex items-center justify-start">
                        EMPLOYEE NAME
                    </span>
                    <span className="text-xs font-bold text-gray-500 flex items-center justify-start">
                       CREATION DATE
                    </span>
                    <span className="text-xs font-bold text-gray-500 flex items-center justify-start">
                        STATUS
                    </span>
                    <span className="text-xs font-bold text-gray-500 flex items-center justify-start">
                        START DATE
                    </span>
                    <span className="text-xs font-bold text-gray-500 flex items-center justify-start">
                        END DATE
                    </span>
                    <span className="text-xs font-bold text-gray-500 flex items-center justify-start">
                        ACTIONS
                    </span>
                </div>

                {/* Rows */}
                <div className="divide-y divide-gray-200">
                <ApprovalList
            doctype={"Shift Request"}
            pageSize={10}
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
