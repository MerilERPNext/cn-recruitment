import React from "react";
import { FiArrowLeft } from "react-icons/fi";
import { FaPencilRuler } from "react-icons/fa";
import { format } from "date-fns";

type Props = {
  request: {
    leave_type: string;
    from_date: string;
    to_date: string;
    status: string;
    description?: string;
  };
  onClose: () => void;
  actions?: React.ReactNode;
};

const RequestDetailsModal: React.FC<Props> = ({
  request,
  onClose,
  actions,
}) => {
  const getStatusBadge = (status: string) => {
    const isPending = status === "Open";
    return (
      <span
        className={`text-sm font-medium px-3 py-1 rounded-xl ${
          isPending ? "bg-yellow-100 text-yellow-800" : ""
        }`}
      >
        {isPending ? "Pending" : status}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col h-screen">
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-2 flex items-center z-10">
        <button
          onClick={onClose}
          className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
        >
          <FiArrowLeft className="w-5 h-5 mr-2" />
        </button>
        <h2 className="text-lg font-semibold">Leave Request Details</h2>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <div className="bg-white border rounded-2xl shadow-md w-full max-w-md p-6 space-y-4 mx-auto">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <FaPencilRuler className="text-blue-600 text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {request.leave_type}
              </h3>
              {getStatusBadge(request.status)}
            </div>
          </div>

          <hr className="border-gray-200" />

          <div className="flex justify-between text-sm text-gray-600">
            <div>
              <div className="font-semibold">From</div>
              <div className="text-gray-900">
                {format(new Date(request.from_date), "MMM d, yyyy")}
              </div>
            </div>
            <div>
              <div className="font-semibold">To</div>
              <div className="text-gray-900">
                {format(new Date(request.to_date), "MMM d, yyyy")}
              </div>
            </div>
          </div>

          {request.description && (
            <div className="text-sm">
              <div className="font-semibold text-gray-600 mb-1">
                Reason for leave
              </div>
              <div className="bg-gray-100 p-4 rounded-lg text-gray-900 whitespace-pre-wrap">
                {request.description}
              </div>
            </div>
          )}

          {actions && <div className="pt-4">{actions}</div>}
        </div>
      </div>
    </div>
  );
};

export default RequestDetailsModal;
