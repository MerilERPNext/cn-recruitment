import React from "react";

const LeaveRequestDetails: React.FC = () => {
    const employee = {
        name: "Ethan Harper",
        role: "Software Engineer",
        photoUrl: "https://i.pravatar.cc/150?img=3",
    };

    const leave = {
        type: "Sick Leave",
        fromDate: "July 15, 2024",
        toDate: "July 16, 2024",
        reason: "Feeling unwell, diagnosed with the flu.",
        status: "Pending" as "Pending" | "Approved" | "Rejected",
    };

    const handleApprove = () => {
        alert("Leave Approved");
    };

    const handleReject = () => {
        alert("Leave Rejected");
    };

    return (
        <div className="max-w-sm mx-auto bg-gray-100 p-4">

            <div className="flex items-center mb-2">
                <h2 className="text-sm font-semibold text-gray-400">HR-EMP-0001</h2>
            </div>


            <div className="bg-white rounded-lg p-4 flex items-center mb-4">
                <img
                    src={employee.photoUrl}
                    alt={employee.name}
                    className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                    <p className="font-semibold">{employee.name}</p>
                    <p className="text-sm text-gray-500">{employee.role}</p>
                </div>
            </div>

            <div className="flex items-center mb-2">
                <h2 className="text-sm font-semibold text-gray-400">LEAVE DETAILS</h2>
            </div>

            <div className="bg-white rounded-lg p-4 space-y-4">
                <DetailRow label="Leave Type" value={leave.type} />
                <DetailRow label="From Date" value={leave.fromDate} />
                <DetailRow label="To Date" value={leave.toDate} />
                <DetailRow label="Reason" value={leave.reason} />
                <div className="flex justify-between">
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <span className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-[20px]">
                        {leave.status}
                    </span>
                </div>
            </div>


            <div className="flex justify-between mt-6 space-x-4">
                <button
                    onClick={handleApprove}
                    className="flex-1 bg-black text-white py-2 rounded-[20px]"
                >
                    Approve
                </button>
                <button
                    onClick={handleReject}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-[20px]"
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
    <div className="flex justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-sm text-right font-medium text-gray-700 max-w-[60%] text-ellipsis overflow-hidden">
            {value}
        </p>
    </div>
);

export default LeaveRequestDetails;
