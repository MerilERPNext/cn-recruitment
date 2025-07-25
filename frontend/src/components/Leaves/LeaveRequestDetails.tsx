import React from "react";
import { TeamLeaveRequest } from "../../types/leaves";

interface LeaveRequestDetailsProps {
    request: TeamLeaveRequest;
}

const LeaveRequestDetails: React.FC<LeaveRequestDetailsProps> = ({ request }) => {
    const handleApprove = () => {
        alert("Leave Approved");
    };

    const handleReject = () => {
        alert("Leave Rejected");
    };


    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="max-w-sm mx-auto bg-gray-100 p-4">
            <div className="flex items-center mb-2">
                <h2 className="text-sm font-semibold text-gray-400">EMPLOYEE</h2>
            </div>

            <div className="bg-white rounded-lg p-4 flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mr-4">
                    {request.employee_name?.charAt(0) || 'U'}
                </div>
                <div>
                    <p className="font-semibold">{request.employee_name || 'Employee Name'}</p>
                    <p className="text-sm text-gray-500">{request.department || 'Department'}</p>
                </div>
            </div>
            <h2 className="font-semibold text-gray-400 text-sm mb-2">LEAVE DETAILS</h2>
            <div className="bg-white rounded-lg p-4 mb-4">
                <DetailRow label="Leave Type" value={request.leave_type || 'N/A'} />
                <DetailRow
                    label="Duration"
                    value={`${formatDate(request.from_date)} - ${formatDate(request.to_date)}`}
                />
                <DetailRow label="Status" value={request.status || 'Pending'} />
                {request.description && (
                    <div className="mt-4">
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Reason</h3>
                        <p className="text-sm text-gray-800">{request.description}</p>
                    </div>
                )}
            </div>

            <div className="flex space-x-4">
                <button
                    onClick={handleApprove}
                    className="flex-1 bg-black text-white py-2 px-4 rounded-[1.5rem] hover:bg-green-600 transition-colors"
                >
                    Approve
                </button>
                <button
                    onClick={handleReject}
                    className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-[1.5rem] hover:bg-red-600 transition-colors"
                >
                    Reject
                </button>
            </div>
        </div>
    );
};

const DetailRow = ({
    label,
    value,
}: {
    label: string;
    value: string;
}) => (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-sm font-medium">{value}</span>
    </div>
);

export default LeaveRequestDetails;
