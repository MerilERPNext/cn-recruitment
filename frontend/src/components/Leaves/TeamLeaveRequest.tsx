import { useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import TeamLeaveRequestItem from "./TeamLeaveRequestItem";
import FrappeListView from "../ListView";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import type { TeamLeaveRequest } from "../../types/leaves";
import { TeamLeaveRequestSkeleton } from "./LeaveSkeletons";
import { FaPencilRuler } from "react-icons/fa";
import { format } from "date-fns";

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
        <div className="fixed inset-0 z-50 bg-white flex flex-col h-screen">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-2 flex items-center z-10">
            <button
              onClick={handleCloseModal}
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <FiArrowLeft className="w-5 h-5 mr-2" />
            </button>
            <h2 className="text-lg font-semibold">Leave Request Details</h2>
          </div>

          <div className="p-4">
            <div className="bg-white border rounded-2xl shadow-md w-full max-w-md p-6 space-y-4">
              {/* Header with icon, leave type and status */}
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <FaPencilRuler className="text-blue-600 text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedRequest.leave_type}
                  </h3>
                  <span
                    className={`text-sm font-medium px-3 py-1 rounded-xl bg-yellow-100 text-yellow-800`}
                  >
                    {selectedRequest.status === "Open"
                      ? "Pending"
                      : selectedRequest.status}
                  </span>
                </div>
              </div>

              <hr className="border-gray-200" />

              <div className="flex justify-between text-sm text-gray-600">
                <div>
                  <div className="font-semibold">From</div>
                  <div className="text-gray-900">
                    {format(new Date(selectedRequest.from_date), "MMM d, yyyy")}
                  </div>
                </div>
                <div>
                  <div className="font-semibold">To</div>
                  <div className="text-gray-900">
                    {format(new Date(selectedRequest.to_date), "MMM d, yyyy")}
                  </div>
                </div>
              </div>

              {selectedRequest.description && (
                <div className="text-sm">
                  <div className="font-semibold text-gray-600 mb-1">
                    Reason for leave
                  </div>
                  <div className="bg-gray-100 p-4 rounded-lg text-gray-900 whitespace-pre-wrap">
                    {selectedRequest.description}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamLeaveRequest;
