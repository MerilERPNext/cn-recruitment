import React, { useState } from "react";
import LeaveRequestDetails from "./LeaveRequestDetails";
import { FiArrowLeft } from 'react-icons/fi';

interface TeamLeaveRequest {
  id: string;
  employeeName: string;
  employeePhoto: string;
  leaveType: string;
  dateRange: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

const dummyTeamLeaveRequests: TeamLeaveRequest[] = [
  {
    id: "1",
    employeeName: "Jane Cooper",
    employeePhoto: "https://plus.unsplash.com/premium_photo-1688350808212-4e6908a03925?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    leaveType: "Vacation",
    dateRange: "Apr 5 - Apr 10, 2024",
    reason: "Annual family vacation. Booked tickets in advance.",
    status: "Pending"
  },
  {
    id: "2",
    employeeName: "Robert Fox",
    employeePhoto: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    leaveType: "Sick Leave",
    dateRange: "May 1 - May 2, 2024",
    reason: "Doctor's appointment and recovery.",
    status: "Approved"
  },
  {
    id: "3",
    employeeName: "Esther Howard",
    employeePhoto: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    leaveType: "Personal Leave",
    dateRange: "May 20, 2024",
    reason: "Attending a music concert.",
    status: "Rejected"
  },
  {
    id: "4",
    employeeName: "Devon Lane",
    employeePhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    leaveType: "Casual Leave",
    dateRange: "Jun 15 - Jun 16, 2024",
    reason: "Personal work and family commitments.",
    status: "Pending"
  },
  {
    id: "5",
    employeeName: "Savannah Nguyen",
    employeePhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
    leaveType: "Maternity Leave",
    dateRange: "Jul 1 - Sep 30, 2024",
    reason: "Maternity leave for childbirth and recovery.",
    status: "Approved"
  }
];

const TeamLeaveRequestCard: React.FC<{
  request: TeamLeaveRequest;
  onClick: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}> = ({ request, onClick, onApprove, onReject }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-orange-100 text-orange-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getBlockColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-700';
      case 'Pending':
        return 'bg-orange-700';
      case 'Rejected':
        return 'bg-red-700';
      default:
        return 'bg-gray-700';
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      e.stopPropagation();
      return;
    }
    onClick();
  };

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 mb-3 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={handleCardClick}
    >
      <div className="flex items-start space-x-3">

        <div className="flex-1">

          <div className="flex">
            <img
              src={request.employeePhoto}
              alt={request.employeeName}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div className="flex items-start justify-between">
              <div className="ml-3">
                <h3 className="font-semibold text-gray-900 text-sm w-full">{request.employeeName}</h3>
                <p className="text-xs text-gray-600">{request.leaveType}</p>
                <p className="text-xs text-gray-500 mt-1">{request.dateRange}</p>
              </div>

            </div>
            <span className={`px-2 ml-auto justify-self-end  py-1 flex items-center h-5 rounded-[20px] text-xs font-medium ${getStatusColor(request.status)}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${getBlockColor(request.status)}`}></span>
              {request.status}
            </span>

          </div>
          <div>
            <div className="mt-3">
              <p className="text-xs text-gray-700">
                <span className="font-medium">Reason:</span> {request.reason}
              </p>
            </div>
            {request.status === 'Pending' && (
              <div className="flex justify-between gap-2 mt-4">
                <button
                  onClick={() => onReject(request.id)}
                  className="px-4 w-full py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => onApprove(request.id)}
                  className="px-4 w-full py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Approve
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

  );
};

const TeamLeaveRequest: React.FC = () => {
  const [selectedRequest, setSelectedRequest] = useState<TeamLeaveRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardClick = (request: TeamLeaveRequest) => {
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
      <div className="space-y-3">
        {dummyTeamLeaveRequests.map((request) => (
          <TeamLeaveRequestCard
            key={request.id}
            request={request}
            onClick={() => handleCardClick(request)}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}
      </div>

      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center">
            <button
              onClick={handleCloseModal}
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <FiArrowLeft className="w-5 h-5 mr-2" />

            </button>
            <h2 className="text-lg font-semibold text-center">Leave Request Details</h2>
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
