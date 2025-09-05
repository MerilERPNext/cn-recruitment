import { useMemo, useState } from "react";
import { RequestCard } from "./RequestCard";
import { AttendanceRequest } from "../../../types/attendance";
import { AttendanceDetailView } from "../AttendanceDetails";
import { useNavigate } from "react-router";

import ApprovalList from "../../shared/ApprovalList";
import FrappeListView from "../../ListView";
import ApprovalCard from "./ApprovalCard";
import { useGlobalStore } from "../../../hooks/useGlobalStore";

const TeamAttendanceDetails = () => {
  const defaultFilters = useMemo(
    () => ({ status: ["in", ["Closed", "Cancelled"]] }),
    []
  );
  const { refetchAttendance } = useGlobalStore();
  const [refetch, setRefetch] = useState(false);
  const navigate = useNavigate();
  const [selectedRequest, setSelectedRequest] =
    useState<AttendanceRequest | null>(null);

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
              <ApprovalCard
                isSelected={item?.isSelected}
                onToggleSelect={item?.onToggleSelect}
                data={item?.data}
                onAction={item?.onAction}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(request: any) => setSelectedRequest(request)}
              />
            )}
          />
        </div>

        {/* Actioned */}
        <div className="bg-white ">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2 border-b-1 border-gray-200 p-4">
              Actioned Requests
            </h2>
            <div className="space-y-3 px-4">
              <FrappeListView
                doctype="ToDo"
                isSearch={false}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                defaultFilters={defaultFilters as any}
                showRefereshButton={false}
                infiniteScroll={false}
                isFilter={false}
                defaultFields={["*"]}
                pageSize={3}
                refetchTrigger={refetch || refetchAttendance}
                onRefetchComplete={() => setRefetch(false)}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ItemComponent={(props: { item: any }) => {
                  return (
                    <RequestCard
                      key={props?.item?.name}
                      request={props?.item}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onClick={(request: any) => setSelectedRequest(request)}
                    />
                  );
                }}
              />
            </div>
          </div>
        </div>
      </div>
      {selectedRequest && (
        <AttendanceDetailView
          data={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onAction={() => {
            setSelectedRequest(null);
            setRefetch(true);
          }}
        />
      )}
    </>
  );
};

export default TeamAttendanceDetails;
