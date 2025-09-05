import { useState } from "react";
import { useNavigate } from "react-router";

import ApprovalList from "../../components/shared/ApprovalList";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import ApprovalRejectionQueue from "./dashboard/ApprovalRejection";

const TeamAttendanceDetails = () => {

  const { refetchAttendance } = useGlobalStore();
  const [refetch, setRefetch] = useState(false);
  const navigate = useNavigate();


  return (
    <>
      <div className="bg-white min-h-screen">
        <div className="bg-white">
          {/* Pending */}

          <div className="flex justify-between p-4">
            <h2 className=" text-lg font-semibold text-gray-800">
              Pending Requests
            </h2>
            <button
              onClick={() => {
                navigate(
                  "/webapp/attendance/team-attendance-requests/pendings"
                );
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View All
            </button>
          </div>

          <ApprovalList
            doctype={"Attendance Request"}
            pageSize={5}
            refetch={refetch || refetchAttendance}
            onApprovalRefetchComplete={() => {
              setRefetch(false);
            }}
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
    </>
  );
};

export default TeamAttendanceDetails;
