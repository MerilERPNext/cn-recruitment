import { useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import LeaveRequestDetails from "./LeaveRequestDetails";
import TeamLeaveRequestItem from "./TeamLeaveRequestItem";
import FrappeListView from "../ListView";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import type { TeamLeaveRequest } from "../../types/leaves";

const TeamLeaveRequest = () => {
  const [selectedRequest, setSelectedRequest] =
    useState<TeamLeaveRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: userId, isLoading: isUserLoading } = useLoggedInUser();

  const handleCardClick = (request: any) => {
    // Map the item to TeamLeaveRequest type, adding a dummy id if missing
    const teamRequest: TeamLeaveRequest = {
      id: request.id || request.name || '',
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

  if (isUserLoading || !userId) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-3"></div>
          <p className="text-gray-500">Loading team leave requests...</p>
        </div>
      </div>
    );
  }

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
        isSearch={false}
        infiniteScroll={true}
        showRefereshButton={false}
      />

      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="bg-white border-b border-gray-200 p-4 flex items-center sticky top-0">
            <button
              onClick={handleCloseModal}
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <FiArrowLeft className="w-5 h-5 mr-2" />
            </button>
            <h2 className="text-lg font-semibold">
              Leave Request Details
            </h2>
          </div>
          <div className="p-4 max-w-md mx-auto">
            <LeaveRequestDetails request={selectedRequest} />
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamLeaveRequest;
