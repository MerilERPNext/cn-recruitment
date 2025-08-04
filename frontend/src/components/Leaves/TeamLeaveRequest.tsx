import { useState } from "react";
import TeamLeaveRequestItem from "./TeamLeaveRequestItem";
import FrappeListView from "../ListView";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import type { TeamLeaveRequest } from "../../types/leaves";
import { TeamLeaveRequestSkeleton } from "./LeaveSkeletons";
import RequestDetailsModal from "./RequestDetailsModal";

const TeamLeaveRequest = () => {
  const [selectedRequest, setSelectedRequest] =
    useState<TeamLeaveRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: userId, isLoading: isUserLoading } = useLoggedInUser();

  const handleCardClick = (request: any) => {
    const teamRequest: TeamLeaveRequest = {
      id: request.id || request.name || "",
      name: request.name,
      employee_name: request.employee_name,
      leave_type: request.leave_type,
      from_date: request.from_date,
      to_date: request.to_date,
      status: request.status,
      description: request.description,
      department: request.department,
    };
    setSelectedRequest(teamRequest);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  const handleApprove = (id: string) => {
    console.log(`Approving leave request ${id}`);
  };

  const handleReject = (id: string) => {
    console.log(`Rejecting leave request ${id}`);
  };

  if (isUserLoading || !userId) return null;

  return (
    <div className="space-y-3">
      <FrappeListView
        doctype="Leave Application"
        ItemComponent={({ item }) => (
          <TeamLeaveRequestItem
            item={item}
            onClick={() => handleCardClick(item)}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
        defaultFields={[
          "name",
          "employee_name",
          "leave_type",
          "from_date",
          "to_date",
          "status",
          "description",
        ]}
        defaultFilters={{
          leave_approver: userId || "",
        }}
        isSearch={true}
        searchFields={["employee_name", "leave_type", "status"]}
        infiniteScroll={true}
        showRefereshButton={true}
        SkeletonComponent={TeamLeaveRequestSkeleton}
      />
      {isModalOpen && selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default TeamLeaveRequest;
