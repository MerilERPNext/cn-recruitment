import { useMemo, useState } from "react";
import { RequestCard } from "./RequestCard";
import { AttendanceRequest } from "../../../types/attendance";
import { AttendanceDetailView } from "../AttendanceDetails";
import { useNavigate } from "react-router";

import ApprovalList from "../../shared/ApprovalList";
import FrappeListView from "../../ListView";
import ApprovalCard from "./ApprovalCard";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import CardTable from "../../shared/CardTable";

const TeamAttendanceDetails = () => {
  const defaultFilters = useMemo(
    () => ({
      reference_type: "Attendance Request",
      status: ["in", ["Closed", "Cancelled"]],
    }),
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
        <div className="bg-white px-2">
          {/* Pending */}

          <div className="flex justify-between pt-4 mb-2 border-b-1 border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 pb-1">
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
          <CardTable
            titles={[
              "Select",
              "Allocated To",
              "Description",
              "Date",
              "Status",
              "Actions",
            ]}
          >
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
          </CardTable>
        </div>

        {/* Actioned */}
        <div className="bg-white px-2 mt-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2 border-b-1 border-gray-200 pb-1">
              Actioned Requests
            </h2>
            <CardTable
              titles={["Allocated To", "Description", "Date", "Status"]}
            >
              <div>
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
            </CardTable>
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
