import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DataListView from "../DataListView";
import EmpLeaveRequestCard from "./EmpLeaveRequestCard";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import CardTable from "../shared/CardTable";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import useCurrentUser from "../../hooks/useCurrentUser";
import { MyLeaveRequestType } from "../../types/leaves";
import {
  useGetButtonsStatus,
  useReplaceLeave,
  useRevokeApprovedLeave,
} from "../../hooks/useLeaves";
import ReplaceLeaveModal from "./ReplaceLeaveModal";

const MyLeaveRequests = ({
  pageSize = 5,
  showPagination = false,
}: {
  pageSize?: number;
  showPagination?: boolean;
  showLeaveRequest?: boolean;
}) => {
  const replaceLeave = useReplaceLeave();
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();

  const [replaceModalData, setReplaceModalData] = useState<{
    isOpen: boolean;
    leaveType?: string;
    leaveData?: string;
  }>({
    isOpen: false,
    leaveType: undefined,
    leaveData: undefined,
  });
  const navigate = useNavigate();
  const { mutate: revokeLeave } = useRevokeApprovedLeave();
  const { data: buttonStatus } = useGetButtonsStatus(
    currentEmployee?.employee || ""
  );

  const handleOpenReplaceModal = (leaveData: MyLeaveRequestType) => {
    setReplaceModalData({
      isOpen: true,
      leaveType: leaveData?.reference_document?.leave_type,
      leaveData: leaveData?.reference_document?.name,
    });
  };

  const handleCloseReplaceModal = () => {
    setReplaceModalData({
      isOpen: false,
      leaveType: undefined,
      leaveData: undefined,
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleReplace = (data: any) => {
    replaceLeave.mutate(
      {
        leave_application: replaceModalData.leaveData ?? "",
        new_leave_type: data.newLeaveType,
        first_half_leave_type: data.firstHalfType,
        second_half_leave_type: data.secondHalfType,
      },
      {
        onSuccess: () => {
          handleCloseReplaceModal();
          setTimeout(() => {
            setRefetchAttendance(true);
          }, 2000);
        },
      }
    );
  };

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
      <div>
        <div className="bg-white h-full md:px-4 md:pt-2">
          <div className="bg-white px-2">
            <div className="flex justify-between pt-4 mb-2 border-b-1 border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 pb-1">
                Pending Requests
              </h2>
              <button
                onClick={() => navigate("/webapp/leave-app/requests/pendings")}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View All
              </button>
            </div>
            <CardTable
              titles={[
                "Leave Type",
                "From Date",
                "To Date",
                "Description",
                "Status",
                "Actions",
              ]}
              columnWidths={["1fr 1fr 1fr 2.5fr 1fr 0.5fr"]}
            >
              {currentEmployee?.employee && (
                <DataListView
                  queryKey="leave-requests"
                  customAPI={{
                    method:
                      "cn_leave_shift_managment.api.get_open_approval_todos",
                    params: {
                      doctype: "Leave Application",
                      employee: currentEmployee?.employee,
                    },
                  }}
                  defaultFilters={{ status: "Open" }}
                  ItemComponent={(props: { item: MyLeaveRequestType }) => (
                    <EmpLeaveRequestCard
                      data={props.item}
                      buttonStatus={buttonStatus}
                      onOpenReplaceModal={() =>
                        handleOpenReplaceModal(props.item)
                      }
                    />
                  )}
                  SkeletonComponent={CardSkeleton}
                  onRefetchComplete={() => setRefetchAttendance(false)}
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
              )}
            </CardTable>
          </div>
        </div>
        <div className="bg-white h-full md:px-4 pt-2 mb-18 mt-2">
          <div className="bg-white px-2">
            <div className="flex justify-between pt-4 mb-2 border-b-1 border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 pb-1">
                Actioned Requests
              </h2>
              <button
                onClick={() => navigate("/webapp/leave-app/requests/actioned")}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View All
              </button>
            </div>
            <CardTable
              titles={[
                "Leave Type",
                "From Date",
                "To Date",
                "Description",
                "Status",
                "Actions",
              ]}
              columnWidths={["1fr 1fr 1fr 2.5fr 1fr 0.5fr"]}
            >
              {currentEmployee?.employee && (
                <DataListView
                  queryKey="leave-requests"
                  customAPI={{
                    method:
                      "cn_leave_shift_managment.api.get_open_approval_todos",
                    params: {
                      doctype: "Leave Application",
                      employee: currentEmployee?.employee,
                    },
                  }}
                  defaultFilters={{
                    status: ["in", ["Rejected", "Approved"]],
                  }}
                  ItemComponent={(props: { item: MyLeaveRequestType }) => (
                    <EmpLeaveRequestCard
                      data={props.item}
                      buttonStatus={buttonStatus}
                      onOpenReplaceModal={() =>
                        handleOpenReplaceModal(props.item)
                      }
                      onRevokeApproved={() =>
                        revokeLeave(props.item.reference_document?.name ?? "")
                      }
                    />
                  )}
                  SkeletonComponent={CardSkeleton}
                  onRefetchComplete={() => setRefetchAttendance(false)}
                  refetchTrigger={refetchAttendance}
                  isSearch={false}
                  isFilter={false}
                  pageSize={pageSize}
                  showRefreshButton={false}
                  orderBy="modified desc"
                  infiniteScroll={false}
                  loadMorePagination
                  showPagination={showPagination}
                />
              )}
            </CardTable>
          </div>
        </div>
      </div>

      <ReplaceLeaveModal
        isOpen={replaceModalData.isOpen}
        onClose={handleCloseReplaceModal}
        onReplace={handleReplace}
        currentLeaveType={replaceModalData.leaveType}
        currentLeaveName={replaceModalData.leaveData}
      />
    </>
  );
};

export default MyLeaveRequests;
