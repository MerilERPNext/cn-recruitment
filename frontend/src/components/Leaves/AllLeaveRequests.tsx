import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DataListView from "../DataListView";
import EmpLeaveRequestCard from "./EmpLeaveRequestCard";
import useCurrentUser from "../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import { useScreenSize } from "../../hooks/useScreenSize";
import CardTable from "../shared/CardTable";
import { MyLeaveRequestType } from "../../types/leaves";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import {
  useGetButtonsStatus,
  useReplaceLeave,
  useRevokeApprovedLeave,
} from "../../hooks/useLeaves";
import ReplaceLeaveModal from "./ReplaceLeaveModal";
import HeaderBar from "../HeaderBar";

const AllLeaveRequest = ({
  pageSize = 10,
  showPagination = true,
}: {
  pageSize?: number;
  showPagination?: boolean;
  showLeaveRequest?: boolean;
}) => {
  const { isDesktop } = useScreenSize();
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();
  const location = useLocation();
  const { mutate: revokeLeave } = useRevokeApprovedLeave();
  const { data: buttonStatus } = useGetButtonsStatus(
    currentEmployee?.employee || ""
  );
  const navigate = useNavigate();
  const replaceLeave = useReplaceLeave();
  const [replaceModalData, setReplaceModalData] = useState<{
    isOpen: boolean;
    leaveType?: string;
    leaveData?: string;
  }>({
    isOpen: false,
    leaveType: undefined,
    leaveData: undefined,
  });

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

  const statusType = location.pathname.includes("/actioned")
    ? "actioned"
    : "pending";
  const title = location.pathname.includes("/actioned")
    ? "Actioned Requests"
    : "Pending Requests";

  const defaultFilters = useMemo(() => {
    if (!currentEmployee?.employee) return undefined;

    const baseFilters = { employee: currentEmployee?.employee };

    if (statusType === "pending") {
      return { ...baseFilters, status: "Open" };
    } else if (statusType === "actioned") {
      return { ...baseFilters, status: ["in", ["Rejected", "Approved"]] };
    }

    return baseFilters;
  }, [currentEmployee?.employee, statusType]);

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
    <div className="flex flex-col min-h-screen md:min-h-full bg-white absolute inset-0 z-50">
      {!isDesktop && (
        <header className="sticky top-0 z-50 bg-white shadow-sm">
          <HeaderBar title={title} onBack={() => navigate(-1)} />
        </header>
      )}
      <div className=" bg-white h-full px-4 pt-2 mb-32 flex-1 overflow-y-auto">
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
          <DataListView
            queryKey={["leave-requests", statusType]}
            customAPI={{
              method: "cn_leave_shift_managment.api.get_open_approval_todos",
              params: {
                doctype: "Leave Application",
                employee: currentEmployee?.employee,
              },
            }}
            defaultFilters={defaultFilters}
            ItemComponent={(props: { item: MyLeaveRequestType }) => (
              <EmpLeaveRequestCard
                data={props.item}
                buttonStatus={buttonStatus}
                onOpenReplaceModal={() => handleOpenReplaceModal(props.item)}
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
            loadMorePagination={true}
            showPagination={showPagination}
          />
        </CardTable>
      </div>

      <ReplaceLeaveModal
        isOpen={replaceModalData.isOpen}
        onClose={handleCloseReplaceModal}
        onReplace={handleReplace}
        currentLeaveType={replaceModalData.leaveType}
        currentLeaveName={replaceModalData.leaveData}
      />
    </div>
  );
};

export default AllLeaveRequest;
