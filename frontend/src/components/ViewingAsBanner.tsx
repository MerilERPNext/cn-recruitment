import React from "react";
import { X, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useTargetUser } from "../context/ViewedUserContext";
import { useEmployee } from "../hooks/useEmployee";

const ViewingAsBanner: React.FC = () => {
  const { targetEmployeeId, isViewingOtherUser, clearTargetEmployee } =
    useTargetUser();
  const { data: targetEmployee } = useEmployee(targetEmployeeId);

  if (!isViewingOtherUser || !targetEmployee) {
    return null;
  }

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        <span className="text-sm flex items-center font-medium text-blue-900">
          <Link
            to={`/webapp/employee-profile?target_user=${targetEmployeeId}`}
            className="font-semibold hover:underline"
          >
            {targetEmployee.employee_name || targetEmployee.name}
          </Link>
          <Link
            to={`/webapp/employee-profile?target_user=${targetEmployeeId}`}
            className="ml-2 inline-flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
          >
            <ExternalLink className="size-4" />
          </Link>
        </span>
      </div>
      <button
        onClick={clearTargetEmployee}
        className="flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 hover:bg-blue-100 px-3 py-1 rounded transition-colors"
        aria-label="Exit viewing mode"
      >
        <X className="w-4 h-4" />
        <span>Exit View</span>
      </button>
    </div>
  );
};

export default ViewingAsBanner;
