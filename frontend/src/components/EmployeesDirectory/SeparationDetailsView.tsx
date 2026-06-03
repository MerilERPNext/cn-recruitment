import React from "react";
import { useGetSeparationDetails } from "../../hooks/useEmployee";
import formatToIndianDate from "../../utils/formatToIndianDate";

interface SeparationDetailsViewProps {
  employeeId: string;
}

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
        <span className="text-sm font-medium text-gray-800">{data.exit_date ? formatToIndianDate(data.exit_date) : 'N.A.'}</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Of Approval</span>
        <span className="text-sm font-medium text-gray-800">{data.date_of_approval ? formatToIndianDate(data.date_of_approval) : 'N.A.'}</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Separation Approved By</span>
        <span className="text-sm font-medium text-gray-800">{data.separation_approved_by}</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">De-Activated By</span>
        <span className="text-sm font-medium text-gray-800">{data.de_activated_by}</span>
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
