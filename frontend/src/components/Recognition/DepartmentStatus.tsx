import React from "react";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import { DepartmentStatus as DeptStatusType } from "../../types/recognition";
import { CheckCircle, Clock, XCircle } from "lucide-react";

interface DepartmentStatusProps {
  overallApprovalPercentage: number;
  totalPending: number;
  departments?: DeptStatusType[];
  isLoading?: boolean;
}

export const DepartmentStatus: React.FC<DepartmentStatusProps> = ({
  overallApprovalPercentage,
  totalPending,
  departments = [],
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card radius="xl" className="border p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card radius="xl" className="border p-4 md:p-6">
      <Typography variant="subheading" className="font-semibold mb-1">
        Nomination Status
      </Typography>
      <Typography variant="bodySmall" color="body2" className="mb-4">
        Department-wise nomination approval tracking
      </Typography>

      {/* Summary row */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{overallApprovalPercentage}%</span>
            <span className="text-xs text-gray-500">overall approval</span>
          </div>
          <div className="w-full bg-gray-200 rounded-sm h-1.5 mt-1.5">
            <div
              className="bg-emerald-500 h-1.5 rounded-sm transition-all"
              style={{ width: `${overallApprovalPercentage}%` }}
            />
          </div>
        </div>
        {totalPending > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 rounded-md shrink-0">
            <Clock className="size-3.5 text-yellow-700" />
            <span className="text-xs font-medium text-yellow-800">{totalPending} pending</span>
          </div>
        )}
      </div>

      {/* Department breakdown */}
      {departments.length > 0 ? (
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {departments.map((dept) => (
            <div key={dept.department} className="space-y-1">
              <div className="flex items-center justify-between">
                <Typography variant="bodySmall" className="font-medium truncate flex-1 mr-2">
                  {dept.department}
                </Typography>
                <div className="flex items-center gap-2 shrink-0 text-xs">
                  <span className="flex items-center gap-0.5 text-emerald-600">
                    <CheckCircle className="size-3" />
                    {dept.approved}
                  </span>
                  {dept.pending > 0 && (
                    <span className="flex items-center gap-0.5 text-yellow-600">
                      <Clock className="size-3" />
                      {dept.pending}
                    </span>
                  )}
                  {dept.rejected > 0 && (
                    <span className="flex items-center gap-0.5 text-red-500">
                      <XCircle className="size-3" />
                      {dept.rejected}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-sm h-1">
                <div
                  className="bg-emerald-500 h-1 rounded-sm transition-all"
                  style={{ width: `${dept.approval_percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-400">
          <Typography variant="bodySmall">No department data available</Typography>
        </div>
      )}
    </Card>
  );
};
