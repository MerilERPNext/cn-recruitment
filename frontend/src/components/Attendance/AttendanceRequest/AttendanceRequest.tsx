import { Plus } from "lucide-react";
import DataListView from "../../DataListView";
import AttndanceRequestForm from "./AttendanceRequestForm";
import { useState } from "react";
import EmpAttendanceRequestCard from "../Employee/EmpAttendanceRequestCard";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useScreenSize } from "../../../hooks/useScreenSize";
import CardTable from "../../shared/CardTable";
import { MyAttendanceRequest } from "../../../types/attendance";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useNavigate } from "react-router-dom";

const AttendanceRequest = ({
  pageSize = 5,
  showPagination = false,
  showAttendanceRequest = true,
}: {
  pageSize?: number;
  showPagination?: boolean;
  showAttendanceRequest?: boolean;
}) => {
  const { isDesktop } = useScreenSize();
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();

  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();
  const CardSkeleton = () => (
    <div className="rounded-xl bg-gray-100 animate-pulse my-4">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between gap-1">
          <div>
            <div className="h-4 w-32 bg-gray-300 rounded mb-2"></div>
            <div className="h-3 w-24 bg-gray-300 rounded"></div>
          </div>
          <div className="h-6 w-16 bg-gray-300 rounded-md"></div>
        </div>
      </div>
    </div>
  );
  return (
    <>
      {showForm ? (
        <AttndanceRequestForm
          onClose={() => {
            setShowForm(false);
          }}
        />
      ) : (
        <div>
          <div className="bg-white h-full px-4 pt-2">
            <div className="bg-white">
              <div className="bg-white px-2">
                {/* Pending */}

                <div className="flex justify-between pt-4 mb-2 border-b-1 border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800 pb-1">
                    Pending Attendance Requests
                  </h2>
                  <button
                    onClick={() => {
                      navigate(
                        "/webapp/attendance/attendance-request/pendings"
                      );
                    }}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View All
                  </button>
                </div>
                <CardTable
                  titles={[
                    "Request Type",
                    "From Date",
                    "To Date",
                    "Status",
                    "Actions",
                  ]}
                >
                  {currentEmployee?.employee ? (
                    <DataListView
                      queryKey="attendance-requests"
                      customAPI={{
                        method:
                          "cn_leave_shift_managment.api.get_open_approval_todos",
                        params: {
                          doctype: "Attendance Request",
                          employee: currentEmployee?.employee,
                        },
                      }}
                      defaultFilters={{
                        status: "Pending",
                      }}
                      ItemComponent={(props: { item: MyAttendanceRequest }) => {
                        return (
                          <EmpAttendanceRequestCard
                            data={{
                              ...props?.item,
                            }}
                          />
                        );
                      }}
                      SkeletonComponent={CardSkeleton}
                      onItemClick={(data) => {
                        console.log(data);
                      }}
                      onRefetchComplete={() => {
                        setRefetchAttendance(false);
                      }}
                      refetchTrigger={refetchAttendance}
                      isSearch={false}
                      isFilter={false}
                      pageSize={pageSize}
                      showRefreshButton={false}
                      orderBy="modified desc"
                      infiniteScroll={false}
                      loadMorePagination={true}
                      showPagination={showPagination}
                    />
                  ) : (
                    <></>
                  )}
                </CardTable>
              </div>
            </div>
          </div>
          <div className="bg-white h-full px-4 pt-2 mb-18 mt-2">
            <div className="bg-white px-2">
              <div className="flex justify-between pt-4 mb-2 border-b-1 border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 pb-1">
                  Actioned Attendance Requests
                </h2>
                <button
                  onClick={() => {
                    navigate(
                      "/webapp/attendance/attendance-request/actioned"
                    );
                  }}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  View All
                </button>
              </div>

              <CardTable
                titles={[
                  "Request Type",
                  "From Date",
                  "To Date",
                  "Status",
                  "Actions",
                ]}
              >
                {currentEmployee?.employee ? (
                  <DataListView
                    queryKey="attendance-requests"
                    customAPI={{
                      method:
                        "cn_leave_shift_managment.api.get_open_approval_todos",
                      params: {
                        doctype: "Attendance Request",
                        employee: currentEmployee?.employee,
                      },
                    }}
                    defaultFilters={{
                      status: ["in", ["Rejected", "Approved"]],
                    }}
                    ItemComponent={(props: { item: MyAttendanceRequest }) => {
                      return (
                        <EmpAttendanceRequestCard
                          data={{
                            ...props?.item,
                          }}
                        />
                      );
                    }}
                    SkeletonComponent={CardSkeleton}
                    onItemClick={(data) => {
                      console.log(data);
                    }}
                    onRefetchComplete={() => {
                      setRefetchAttendance(false);
                    }}
                    refetchTrigger={refetchAttendance}
                    isSearch={false}
                    isFilter={false}
                    pageSize={pageSize}
                    showRefreshButton={false}
                    orderBy="modified desc"
                    infiniteScroll={false}
                    loadMorePagination={true}
                    showPagination={showPagination}
                  />
                ) : (
                  <></>
                )}
              </CardTable>
            </div>
          </div>
        </div>
      )}

      {/* Add Attendance Request button - Only show for mobile since desktop has Actions button */}
      {!isDesktop && showAttendanceRequest && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-300 py-2">
          <div className="max-w-7xl mx-auto px-4">
            <button
              className="flex justify-center gap-2 w-full py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus /> <span>Add Attendance Request</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AttendanceRequest;
