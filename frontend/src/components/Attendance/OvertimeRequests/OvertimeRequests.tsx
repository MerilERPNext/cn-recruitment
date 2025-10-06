import { useMemo, useState } from "react";
import CardTable from "../../shared/CardTable";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useNavigate } from "react-router";
import {
  LoadingAction,
  MyPlannedAttendanceRequest,
} from "../../../types/attendance";
import ApprovalList from "../../shared/ApprovalList";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import DataListView from "../../DataListView";
import { MyOvertimeDetails } from "./MyOvertimeRequestDetails";
import { MyRequestCard } from "./MyRequestCard";
import OvertimeApprovalCard from "./OvertimeApprovalCard";

const OvertimeRequests = () => {
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();
  const [refetch, setRefetch] = useState(false);
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
  const defaultFilters = useMemo(
    () => ({
      reference_type: "Planned Overtime Request",
      employee: currentEmployee?.employee,
    }),
    [currentEmployee]
  );

  const [mySelectedRequest, setMySelectedRequest] = useState<
    (MyPlannedAttendanceRequest & { loadingAction?: LoadingAction }) | null
  >(null);
  return (
    <div>
      <div className="bg-white min-h-screen">
        <div className="bg-white px-2">
          {/* Pending */}

          <div className="flex justify-between pt-4 mb-2 border-b-1 border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 pb-1">
              Pending Planned Overtime Requests
            </h2>
            <button
              onClick={() => {
                navigate(
                  "/webapp/attendance/planned-overtime-requests/pendings"
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
              "Name",
              "Employee",
              "Description",
              "Due Date",
              "Status",
              "Actions",
            ]}
            columnWidths={["5%", "10%", "10%", "30%", "6%", "6%", "20%"]}
          >
            {currentUser?.name ? (
              <ApprovalList
                doctype={"Planned Overtime Request"}
                pageSize={3}
                showPagination={false}
                refetch={refetch || refetchAttendance}
                status="Open"
                onApprovalRefetchComplete={() => {
                  setRefetch(false);
                }}
                renderCardContent={(item) => (
                  <OvertimeApprovalCard
                    isSelected={item?.isSelected}
                    onToggleSelect={item?.onToggleSelect}
                    data={item?.data}
                    onAction={item?.onAction}
                    onClick={(request: MyPlannedAttendanceRequest) =>
                      setMySelectedRequest(request)
                    }
                    loadingAction={item?.loadingAction}
                  />
                )}
              />
            ) : null}
          </CardTable>
        </div>
        {/* Employee Requests */}
        <div className="bg-white px-2 mt-4">
          <div>
            <div className="flex justify-between pt-4 mb-2 border-b-1 border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 pb-1">
                My Planned Overtime Requests
              </h2>
              <button
                onClick={() => {
                  navigate(
                    "/webapp/attendance/planned-overtime-requests/my-overtime-requests"
                  );
                }}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View All
              </button>
            </div>
            <CardTable
              columnWidths={["10%", "10%", "30%", "10%", "33%"]}
              titles={[
                "Allocated To",
                "Name",
                "Description",
                "Due Date",
                "Status",
              ]}
            >
              {currentEmployee?.employee ? (
                <DataListView
                  queryKey="planned-overtime-request"
                  customAPI={{
                    method:
                      "cn_leave_shift_managment.api.get_open_approval_todos",
                    params: {
                      doctype: "Planned Overtime Request",
                      employee: currentEmployee?.employee,
                    },
                  }}
                  defaultFilters={defaultFilters}
                  ItemComponent={(props: {
                    item: MyPlannedAttendanceRequest;
                  }) => {
                    return (
                      <MyRequestCard
                        request={props?.item}
                        onClick={(request: MyPlannedAttendanceRequest) =>
                          setMySelectedRequest(request)
                        }
                      />
                    );
                  }}
                  onRefetchComplete={() => {
                    setRefetchAttendance(false);
                  }}
                  refetchTrigger={refetchAttendance}
                  isSearch={false}
                  isFilter={false}
                  pageSize={5}
                  showRefreshButton={false}
                  orderBy="modified desc"
                  infiniteScroll={false}
                  loadMorePagination={true}
                  showPagination={false}
                />
              ) : null}
            </CardTable>
          </div>
        </div>
      </div>

      {mySelectedRequest && (
        <MyOvertimeDetails
          data={mySelectedRequest as MyPlannedAttendanceRequest}
          onClose={() => setMySelectedRequest(null)}
          onAction={() => {
            setMySelectedRequest(null);
          }}
        />
      )}
    </div>
  );
};

export default OvertimeRequests;
