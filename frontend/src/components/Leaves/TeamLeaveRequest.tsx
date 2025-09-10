import { useMemo, useState } from "react";
import FrappeListView from "../ListView";
import ApprovalCard from "../Attendance/TeamAttendanceDetails/ApprovalCard";
import { RequestCard } from "../Attendance/TeamAttendanceDetails/RequestCard";
import { useNavigate } from "react-router";
import ApprovalList from "../shared/ApprovalList";
import CardTable from "../shared/CardTable";

const TeamLeaveRequest = () => {
  const defaultFilters = useMemo(
    () => ({ status: ["in", ["Closed", "Cancelled"]] }),
    []
  );
  const [refetch, setRefetch] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <div className="bg-white min-h-full w-full">
        <div className="bg-white w-full px-2">
          <div className="flex justify-between pt-4 mb-2 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 pb-1">
              Pending Requests
            </h2>
            <button
              onClick={() => {
                navigate("/webapp/leave-app/leave-requests/pending");
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
              doctype="Leave Application"
              pageSize={5}
              refetch={refetch}
              onApprovalRefetchComplete={() => setRefetch(false)}
              renderCardContent={(item) => (
                <ApprovalCard
                  isSelected={item?.isSelected}
                  onToggleSelect={item?.onToggleSelect}
                  data={item?.data}
                  onAction={item?.onAction}
                />
              )}
            />
          </CardTable>
        </div>

        <div className="bg-white mt-4 md:px-2">
          <h2 className="text-lg px-2 md:px-0 font-semibold text-gray-800 mb-2 border-b border-gray-200 pb-1">
            Actioned Requests
          </h2>

          <CardTable titles={["Allocated To", "Description", "Date", "Status"]}>
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
              refetchTrigger={refetch}
              onRefetchComplete={() => setRefetch(false)}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ItemComponent={({ item }: { item: any }) => (
                <RequestCard key={item?.name} request={item} />
              )}
            />
          </CardTable>
        </div>
      </div>
    </>
  );
};

export default TeamLeaveRequest;
