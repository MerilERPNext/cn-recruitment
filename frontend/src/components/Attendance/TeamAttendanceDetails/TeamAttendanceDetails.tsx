import { useEffect, useMemo, useState } from "react";
import { RequestCard } from "./RequestCard";
import { AttendanceRequest } from "../../../types/attendance";
import { AttendanceDetailView } from "../AttendanceDetails";
import { useNavigate } from "react-router";

import ApprovalList from "../../shared/ApprovalList";
import FrappeListView from "../../ListView";
import ApprovalCard from "./ApprovalCard";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import CardTable from "../../shared/CardTable";
import { useFetchUsers } from "../../../hooks/userApprovalList";

type LoadingAction = {
  id: string;
  action: string;
};
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

  const [selectedRequest, setSelectedRequest] = useState<
    (AttendanceRequest & { loadingAction?: LoadingAction }) | null
  >(null);
  const fetchUsersMutation = useFetchUsers();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [allRequests, setAllRequests] = useState<any[]>([]);

  const [userMap, setUserMap] = useState<{ [k: string]: string }>({});

  useEffect(() => {
    const emails: string[] = allRequests?.map((item) => item?.allocated_to);
    if (!emails || emails.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fetchUsersMutation?.mutate(
      { emails: emails },
      {
        onSuccess: (data: { [k: string]: string }) => {
          setUserMap(data);
        },
      }
    );
  }, [allRequests]);

  return (
    <>
      <div className="bg-white min-h-screen">
        <div className="bg-white px-2">
          {/* Pending */}

          <div className="flex justify-between pt-4 mb-2 border-b-1 border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 pb-1">
              Pending Team Attendance Requests
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
            columnWidths={["40px", "160px", "0.8fr", "120px", "140px", "0.6fr"]}
          >
            <ApprovalList
              doctype={"Attendance Request"}
              // pageSize={3}
              refetch={refetch || refetchAttendance}
              onApprovalRefetchComplete={() => {
                setRefetch(false);
              }}
              pageSize={3}
              showPagination={false}
              renderCardContent={(item) => (
                <ApprovalCard
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

        {/* Actioned */}
        <div className="bg-white px-2 mt-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2 border-b-1 border-gray-200 pb-1">
              Actioned Team Attendance Requests
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
                  onDataLoad={(data) => setAllRequests(data)}
                  refetchTrigger={refetch || refetchAttendance}
                  onRefetchComplete={() => setRefetch(false)}
                  showPagination={false}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ItemComponent={(props: { item: any }) => {
                    return (
                      <RequestCard
                        key={props?.item?.name}
                        request={{
                          ...props.item,
                          allocated_to_name: userMap[props?.item?.allocated_to],
                        }}
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
          loadingAction={selectedRequest?.loadingAction}
        />
      )}
    </>
  );
};

export default TeamAttendanceDetails;
