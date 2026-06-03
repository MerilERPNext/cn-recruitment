import React from "react";
import { useGetSeparationDetails } from "../../hooks/useEmployee";

interface SeparationDetailsViewProps {
  employeeId: string;
}

const formatValue = (val: string | null | undefined) => {
  if (!val || val.trim() === "") return "N.A.";
  return val;
};

const SeparationDetailsView: React.FC<SeparationDetailsViewProps> = ({ employeeId }) => {
  const { data, isLoading, isError } = useGetSeparationDetails(employeeId);

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-gray-500 animate-pulse">
        Loading separation details...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-4 text-sm text-red-500">
        Failed to load separation details.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-8 p-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Exit Date</span>
        <span className="text-sm font-medium text-gray-800">{formatValue(data.exit_date)}</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Of Approval</span>
        <span className="text-sm font-medium text-gray-800">{formatValue(data.date_of_approval)}</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Separation Approved By</span>
        <span className="text-sm font-medium text-gray-800">{formatValue(data.separation_approved_by)}</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">De-Activated By</span>
        <span className="text-sm font-medium text-gray-800">{formatValue(data.de_activated_by)}</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Deactivation Type</span>
        <span className="text-sm font-medium text-gray-800">N.A.</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Deactivation Reason</span>
        <span className="text-sm font-medium text-gray-800">N.A.</span>
      </div>
    </div>
  );
};

export default SeparationDetailsView;
