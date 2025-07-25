import { useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import LeaveRequestDetails from "./LeaveRequestDetails";
import TeamLeaveRequestItem from "./TeamLeaveRequestItem";
import FrappeListView from "../ListView";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";

const TeamLeaveRequest = () => {
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: userId } = useLoggedInUser();


  const handleCardClick = (request: any) => {
    setSelectedRequest(request);
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

  return (
    <div className="p-4">
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
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center">
            <button
              onClick={handleCloseModal}
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <FiArrowLeft className="w-5 h-5 mr-2" />

            </button>
            <h2 className="text-lg font-semibold text-center">
              Leave Request Details
            </h2>
          </div>
          <div className="p-4">
            <LeaveRequestDetails request={selectedRequest} />
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamLeaveRequest;
