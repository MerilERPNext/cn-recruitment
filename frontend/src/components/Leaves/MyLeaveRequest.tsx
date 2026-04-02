import { useState } from "react";
import { useCurrentEmployee } from "../../hooks/useEmployee";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import {
  useGetButtonsStatus,
  useReplaceLeave,
  useRevokeApprovedLeave,
} from "../../hooks/useLeaves";
import { useScreenSize } from "../../hooks/useScreenSize";
import { MyLeaveRequestType } from "../../types/leaves";
import DataListView from "../DataListView";
import { Typography } from "../shared/atoms/Typography";
import CardTable from "../shared/CardTable";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";
import EmpLeaveRequestCard from "./EmpLeaveRequestCard";
import ReplaceLeaveModal from "./ReplaceLeaveModal";

const MyLeaveRequests = ({
  pageSize = 10,
}: {
  pageSize?: number;
  showLeaveRequest?: boolean;
}) => {
  const replaceLeave = useReplaceLeave();
  const { isDesktop } = useScreenSize();
  const [activeStatus, setActiveStatus] = useState("Open");

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
    currentEmployee?.name || "",
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
      },
    );
  };

  return (
    <div className="flex flex-col h-full">
      {isDesktop && (
        <div className="flex-shrink-0">
          <div className="px-6 py-1 md:py-4">
            <Typography variant="h4">My Leave Requests</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage your leave requests
            </Typography>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        {isEmployeeLoading ? (
          <CardSkeleton />
        ) : (
          <CardTable
            titles={
              activeStatus === "Rejected"
                ? [
                  "Leave Id",
                  "Leave Type",
                  "From Date",
                  "To Date",
                  "Description",
                  "Reason",
                  "Leave Days",
                  "Status",
                  "Reject Reason",
                  "Actions",
                ]
                : [
                  "Leave Id",
                  "Leave Type",
                  "From Date",
                  "To Date",
                  "Description",
                  "Reason",
                  "Leave Days",
                  "Status",
                  "Actions",
                ]
            }
            columnWidths={
              activeStatus === "Rejected"
                ? ["1fr 1fr 1fr 1fr 1.5fr 1fr 1fr 1fr 1.5fr 1fr"]
                : ["1fr 1.5fr 1fr 1fr 1.5fr 1fr 1fr 1fr 1.5fr"]
            }
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
                    showRejectReason={activeStatus === "Rejected"}
                  />
                )}
                onFiltersChange={(filters) => {
                  setActiveStatus(
                    typeof filters.status === "string"
                      ? filters.status
                      : "All",
                  );
                }}
                defaultFilters={{ status: ["!=", "Cancelled"] }}
                isSearch={true}
                isFilter={true}
                filterFields={[
                  {
                    fieldname: "status",
                    label: "Status",
                    fieldtype: "Select",
                    options: [
                      { label: "Pending", value: "Open" },
                      { label: "Approved", value: "Approved" },
                      { label: "Rejected", value: "Rejected" },
                    ],
                  },
                ]}

                SkeletonComponent={CardSkeleton}
                onRefetchComplete={() => setRefetchAttendance(false)}
                refetchTrigger={refetchAttendance}
                pageSize={pageSize}
                showRefreshButton={false}
                infiniteScroll={false}
                loadMorePagination={false}
                showPagination={true}
              />
            )}
          </CardTable>
        )}
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
    </div>
  );
};

export default MyLeaveRequests;
