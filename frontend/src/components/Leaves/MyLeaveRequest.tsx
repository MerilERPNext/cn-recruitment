import React, { useState, useEffect } from "react";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { useEmployeeByUserId } from "../../hooks/useEmployee";
import FrappeListView from "../ListView";
import { LeaveApplicationItem } from "../../types/leaves";
import { useLeaveRequestRefresh } from "./LeaveRequestRefreshContext";
import { MyLeaveRequestSkeleton } from "./LeaveSkeletons";
import RequestDetailsModal from "./RequestDetailsModal";
import { useScreenSize } from "../../hooks/useScreenSize";
import CardTable from "../shared/CardTable";
import LeaveRequestCard from "./LeaveRequestCard";

const MyLeaveRequest: React.FC = () => {
  const {
    data: userId,
    isLoading: isUserLoading,
    error: userError,
  } = useLoggedInUser();
  const {
    data: currentEmployee,
    isLoading: isEmployeeLoading,
    error: employeeError,
  } = useEmployeeByUserId(userId);

  const [selectedRequest, setSelectedRequest] =
    useState<LeaveApplicationItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { setRefetch } = useLeaveRequestRefresh();
  const { isDesktop } = useScreenSize();

  const handleCardClick = (item: LeaveApplicationItem) => {
    setSelectedRequest(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  const unsubscribeRef = React.useRef<(() => void) | null>(null);

  const handleRefetchAvailable = (refetchFn: () => void) => {
    unsubscribeRef.current = setRefetch(refetchFn);
  };

  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [setRefetch]);

  if (userError || employeeError) {
    return (
      <div className="p-4 text-center text-red-600">
        Failed to load Leave Requests. Please try again.
      </div>
    );
  }

  if (isUserLoading || isEmployeeLoading || !currentEmployee?.name) {
    return <MyLeaveRequestSkeleton />;
  }

  return (
    <div className="space-y-3 pb-10 md:pb-20 px-2 md:px-4 md:py-2">
      {isDesktop ? (
        <CardTable
          titles={[
            "Request Type",
            "From Date",
            "To Date",
            "Reason",
            "Status",
            "Actions",
          ]}
        >
          <FrappeListView<LeaveApplicationItem>
            doctype="Leave Application"
            ItemComponent={LeaveRequestCard}
            defaultFields={[
              "name",
              "leave_type",
              "from_date",
              "to_date",
              "status",
              "description",
            ]}
            defaultFilters={{ employee: currentEmployee.name }}
            infiniteScroll={true}
            onRefetchAvailable={handleRefetchAvailable}
            SkeletonComponent={MyLeaveRequestSkeleton}
            isSearch={false}
          />
        </CardTable>
      ) : (
        <FrappeListView<LeaveApplicationItem>
          doctype="Leave Application"
          ItemComponent={({ item }) => (
            <LeaveRequestCard
              item={item}
              doctype="Leave Application"
              onClick={() => handleCardClick(item)}
            />
          )}
          defaultFields={[
            "name",
            "leave_type",
            "from_date",
            "to_date",
            "status",
            "description",
          ]}
          defaultFilters={{ employee: currentEmployee.name }}
          isSearch={true}
          searchFields={["name", "leave_type", "status"]}
          infiniteScroll={true}
          showRefereshButton={true}
          onRefetchAvailable={handleRefetchAvailable}
          SkeletonComponent={MyLeaveRequestSkeleton}
        />
      )}

      {isModalOpen && selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          onClose={handleCloseModal}
          isMyLeaveRequest={true}
          onRevoke={() => console.log("Revoke request triggered")}
        />
      )}
    </div>
  );
};

export default MyLeaveRequest;
