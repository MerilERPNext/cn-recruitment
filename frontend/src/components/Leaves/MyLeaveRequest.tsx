import { useState } from "react";
import DataListView from "../DataListView";
import EmpLeaveRequestCard from "./EmpLeaveRequestCard";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import CardTable from "../shared/CardTable";
import { useCurrentEmployee } from "../../hooks/useEmployee";
import { MyLeaveRequestType } from "../../types/leaves";
import {
  useGetButtonsStatus,
  useReplaceLeave,
  useRevokeApprovedLeave,
} from "../../hooks/useLeaves";
import ReplaceLeaveModal from "./ReplaceLeaveModal";


const MyLeaveRequests = ({
  pageSize = 10,
  showPagination = true,
}: {
  pageSize?: number;
  showPagination?: boolean;
  showLeaveRequest?: boolean;
}) => {
  const replaceLeave = useReplaceLeave();

  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();
  const { data: currentEmployee, isLoading: isEmployeeLoading } =
    useCurrentEmployee();

  const [replaceModalData, setReplaceModalData] = useState<{
    isOpen: boolean;
    leaveType?: string;
    leaveData?: string;
    LeaveDays?: number;
    fromDate?: string;
    toDate?: string;
  }>({
    isOpen: false,
    leaveType: undefined,
    leaveData: undefined,
    LeaveDays: undefined,
    fromDate: undefined,
    toDate: undefined,
  });
  const { mutate: revokeLeave } = useRevokeApprovedLeave();
  const { data: buttonStatus } = useGetButtonsStatus(
    currentEmployee?.name || ""
  );



  const handleOpenReplaceModal = (leaveData: MyLeaveRequestType) => {
    setReplaceModalData({
      isOpen: true,
      leaveType: leaveData?.reference_document?.leave_type,
      leaveData: leaveData?.reference_document?.name,
      LeaveDays: leaveData?.reference_document?.total_leave_days,
      fromDate: leaveData?.reference_document?.from_date,
      toDate: leaveData?.reference_document?.to_date,
    });
  };

  const handleCloseReplaceModal = () => {
    setReplaceModalData({
      isOpen: false,
      leaveType: undefined,
      leaveData: undefined,
      LeaveDays: undefined,
      fromDate: undefined,
      toDate: undefined,
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
            <div className="flex justify-between items-center md:pt-4 mb-2 border-b-1 border-gray-200">
              <h2 className="base-title md:module-title pb-1">
                My Leave Requests
              </h2>
            </div>

            {isEmployeeLoading ? (
              <CardSkeleton />
            ) : (
              <CardTable
                titles={[
                  "Leave Type",
                  "From Date",
                  "To Date",
                  "Description",
                  "Leave Days",
                  "Status",
                  "Actions",
                ]}
                columnWidths={["1fr 1fr 1fr 1.5fr 1fr 1fr 0.5fr"]}
              >
                {currentEmployee?.name && (
                  <DataListView
                    queryKey="leave-requests"
                    customAPI={{
                      method:
                        "cn_leave_shift_managment.api.get_open_approval_todos",
                     
                      params: {
                        doctype: "Leave Application",
                        employee: currentEmployee?.name,
                        status: "Open"
                      },
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
                    isSearch={true}
                    isFilter={true}
                    filterFields={[
                      {
                        fieldname: "status",
                        label: "Status",
                        fieldtype: "Select",
                        options: ["Open", "Approved", "Rejected"],
                      },
                    ]}
                    SkeletonComponent={CardSkeleton}
                    onRefetchComplete={() => setRefetchAttendance(false)}
                    refetchTrigger={refetchAttendance}
                    pageSize={pageSize}
                    showRefreshButton={false}
                    orderBy="modified desc"
                    showPagination={showPagination}
                    infiniteScroll={true}
                    loadMorePagination={false}
                  />
                )}
              </CardTable>
            )}
          </div>
        </div>
      </div>
      {replaceModalData.isOpen && (
        <ReplaceLeaveModal
          isOpen={replaceModalData.isOpen}
          onClose={handleCloseReplaceModal}
          onReplace={handleReplace}
          currentLeaveType={replaceModalData.leaveType}
          currentLeaveName={replaceModalData.leaveData}
          currentLeaveDays={replaceModalData.LeaveDays}
          fromDate={replaceModalData.fromDate}
          toDate={replaceModalData.toDate}
        />
      )}
    </>
  );
};

export default MyLeaveRequests;
