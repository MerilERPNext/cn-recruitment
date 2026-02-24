import React from "react";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";
import { Bell } from "lucide-react";

interface DepartmentStatusProps {
  overallApprovalPercentage: number;
  totalPending: number;
  isLoading?: boolean;
  onReviewClick?: () => void;
}

export const DepartmentStatus: React.FC<DepartmentStatusProps> = ({
  overallApprovalPercentage,
  totalPending,
  isLoading,
  onReviewClick,
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
      <div className="mb-4">
        <Typography variant="subheading" className="font-semibold mb-1">
          Department Status
        </Typography>
        <Typography variant="bodySmall" color="body2">
          Percent of nominations approved.
        </Typography>
      </div>

      {/* Large Percentage Display */}
      <div className="flex items-baseline gap-2 mb-4">
        <Typography variant="h1" className="text-5xl font-bold text-primary">
          {overallApprovalPercentage}%
        </Typography>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
        <div
          className="bg-blue-500 h-3 rounded-full transition-all"
          style={{ width: `${overallApprovalPercentage}%` }}
        />
      </div>

      {/* Pending Reviews */}
      {totalPending > 0 && (
        <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2">
            <Bell className="size-5 text-yellow-600" />
            <div>
              <Typography variant="bodyMedium" className="font-medium text-yellow-900">
                {totalPending} Pending
              </Typography>
              <Typography variant="bodySmall" className="text-yellow-700">
                Requires your review
              </Typography>
            </div>
          </div>
          <Button
            size="sm"
            bgColor="warning"
            onClick={onReviewClick}
            className="shrink-0"
          >
            Review
          </Button>
        </div>
      )}

      {totalPending === 0 && (
        <div className="text-center py-4 text-gray-500">
          <Typography variant="bodySmall">All nominations reviewed</Typography>
        </div>
      )}
    </Card>
  );
};
