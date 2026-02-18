import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import FrappeListView from "./ListView";
import { useCurrentEmployee } from "../hooks/useEmployee";
import { Typography } from "./shared/atoms/Typography";
import {
  IoWarningOutline,
  IoCheckmarkCircleOutline,
  IoChevronDownOutline,
  IoDocumentTextOutline,
  IoInformationCircleOutline,
} from "react-icons/io5";
import { useScreenSize } from "../hooks/useScreenSize";

// Skeleton component for loading states
const PolicyItemSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm animate-pulse mb-3">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          {/* Title skeleton */}
          <div className="h-6 bg-gray-200 rounded-md w-3/4 mb-3"></div>
          {/* Subtitle skeleton */}
          <div className="h-4 bg-gray-100 rounded-md w-1/3"></div>
        </div>
        {/* Status badge skeleton */}
        <div className="h-8 bg-gray-200 rounded-xl w-24 ml-4"></div>
      </div>
      {/* Button skeleton */}
      <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
    </div>
  );
};

// PolicyItem component for FrappeListView
interface PolicyItemProps {
  item: {
    name: string;
    status?: string;
    policy?: string;
    sign_off_mandatory?: boolean;
    due_date?: string;
  };
  index?: number;
  doctype: string;
}

const PolicyItem: React.FC<PolicyItemProps> = ({ item }) => {
  const navigate = useNavigate();
  const { isMobile } = useScreenSize();

  // Handle both static data format and Frappe document format
  const title = item.policy || "Untitled Policy";
  const status = item.status || "Incomplete";
  const policyId = item.name;

  const handleViewPolicy = () => {
    navigate(`/webapp/policies-enforced/view/${policyId}`);
  };

  const isComplete =
    status === "Complete" ||
    status === "Completed" ||
    status === "Acknowledged";

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-300 mb-3 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className={`p-1.5 rounded-lg ${isComplete ? "bg-success-50 text-success-600" : "bg-primary-50 text-primary-600"
                }`}
            >
              <IoDocumentTextOutline size={18} />
            </div>
            <Typography variant={isMobile ? "bodyMedium" : "h4"} className="text-gray-900 group-hover:text-primary-600 transition-colors">
              {title}
            </Typography>
          </div>

          <div className="flex items-center gap-3 mt-1 pl-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.sign_off_mandatory
                ? "bg-red-50 text-red-700 border border-red-100"
                : "bg-blue-50 text-blue-700 border border-blue-100"
                }`}
            >
              {item.sign_off_mandatory ? "Mandatory" : "Optional"}
            </span>
            {item.due_date && !isComplete && (
              <Typography variant="caption" className="text-gray-500">
                Due: {item.due_date}
              </Typography>
            )}
          </div>
        </div>

        <div
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${isComplete
            ? "bg-success-50 text-success-700 border-success-200"
            : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
        >
          {isComplete ? (
            <IoCheckmarkCircleOutline size={14} />
          ) : (
            <IoInformationCircleOutline size={14} />
          )}
          {isComplete ? "Completed" : "Pending"}
        </div>
      </div>

      <button
        onClick={handleViewPolicy}
        disabled={isComplete}
        className={`w-full font-brand font-medium py-2.5 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${isComplete
          ? "bg-gray-100 text-gray-800 cursor-not-allowed border border-gray-200"
          : "bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white shadow-md hover:shadow-lg focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
          }`}
      >
        {isComplete ? (
          <>
            <IoCheckmarkCircleOutline size={18} />
            Acknowledged
          </>
        ) : (
          "View & Acknowledge"
        )}
      </button>
    </div>
  );
};

const PoliciesEnforced: React.FC = () => {
  const [mandatoryPoliciesExpanded, setMandatoryPoliciesExpanded] =
    useState(true);
  const [completedPoliciesExpanded, setCompletedPoliciesExpanded] =
    useState(false);
  const { data: currentEmployee, isLoading: isCurrentEmployeeLoading } =
    useCurrentEmployee();
  const { isMobile } = useScreenSize();

  return (
    <div className="min-h-screen bg-gray-50/50 pb-10">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-r from-primary-600 to-secondary-600 pt-8 pb-16 px-4 sm:px-6 lg:px-8 shadow-lg">
        <div className="max-w-3xl mx-auto">
          <Typography variant={isMobile ? "caption" : "bodySmall"} className="text-white/80 max-w-xl">
            Review and acknowledge mandatory company policies and procedures. Keep track of your compliance status.
          </Typography>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        {/* Action Required Alert */}
        <div className="bg-white rounded-xl shadow-lg border-l-4 border-l-red-500 p-5 mb-8 animate-fadeIn">
          <div className="flex items-start">
            <div className="flex-shrink-0 bg-red-50 p-2 rounded-full">
              <IoWarningOutline className="w-6 h-6 text-red-500" />
            </div>
            <div className="ml-4">
              <Typography variant={isMobile ? "bodyMedium" : "h4"} className="text-gray-900 mb-1">
                Action Required
              </Typography>
              <Typography variant={isMobile ? "caption" : "bodySmall"} className="text-gray-600 leading-relaxed">
                You must complete all <span className="font-semibold text-red-600">mandatory policies</span>.
                Timely acknowledgment is required to maintain compliance and system access.
              </Typography>
            </div>
          </div>
        </div>

        {/* Mandatory Policies Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 transition-all duration-300 hover:shadow-md">
          <button
            onClick={() =>
              setMandatoryPoliciesExpanded(!mandatoryPoliciesExpanded)
            }
            className={`w-full group flex items-center justify-between p-4 bg-white transition-all duration-200 ${mandatoryPoliciesExpanded ? "border-b border-gray-100 bg-gray-50/50" : "hover:bg-gray-50/50"
              }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg transition-colors ${mandatoryPoliciesExpanded ? "bg-primary-100 text-primary-700" : "bg-primary-50 text-primary-600 group-hover:bg-primary-100"
                }`}>
                <IoDocumentTextOutline size={20} />
              </div>
              <div className="text-left">
                <Typography variant={isMobile ? "bodyMedium" : "h4"} className="text-gray-900">
                  Mandatory Policies
                </Typography>
                <Typography variant="caption" className="text-gray-500">
                  Policies requiring your immediate attention
                </Typography>
              </div>
            </div>
            <div
              className={`p-1.5 rounded-full transition-all duration-300 ${mandatoryPoliciesExpanded
                ? "rotate-180 bg-primary-100 text-primary-700"
                : "bg-gray-50 text-gray-400 group-hover:text-primary-600 group-hover:bg-primary-50"
                }`}
            >
              <IoChevronDownOutline size={20} />
            </div>
          </button>

          {mandatoryPoliciesExpanded && (
            <div className="bg-gray-50/30 p-4 animate-slideDown">
              <FrappeListView
                doctype="Policy Details"
                isLoading={isCurrentEmployeeLoading}
                ItemComponent={PolicyItem}
                SkeletonComponent={PolicyItemSkeleton}
                defaultFilters={{
                  status: "Pending",
                  employee_id: currentEmployee?.name || "",
                }}
                defaultFields={[
                  "name",
                  "status",
                  "policy",
                  "sign_off_mandatory",
                  "due_date",
                ]}
                infiniteScroll={true}
                isSearch={true}
                isFilter={false}
                pageSize={10}
              />
            </div>
          )}
        </div>

        {/* Completed Policies Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8 transition-all duration-300 hover:shadow-md">
          <button
            onClick={() =>
              setCompletedPoliciesExpanded(!completedPoliciesExpanded)
            }
            className={`w-full group flex items-center justify-between p-4 bg-white transition-all duration-200 ${completedPoliciesExpanded ? "border-b border-gray-100 bg-gray-50/50" : "hover:bg-gray-50/50"
              }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg transition-colors ${completedPoliciesExpanded ? "bg-success-100 text-success-700" : "bg-success-50 text-success-600 group-hover:bg-success-100"
                }`}>
                <IoCheckmarkCircleOutline size={20} />
              </div>
              <div className="text-left">
                <Typography variant={isMobile ? "bodyMedium" : "h4"} className="text-gray-900">
                  Completed Policies
                </Typography>
                <Typography variant="caption" className="text-gray-500">
                  Access your acknowledged policies history
                </Typography>
              </div>
            </div>
            <div
              className={`p-1.5 rounded-full transition-all duration-300 ${completedPoliciesExpanded
                ? "rotate-180 bg-success-100 text-success-700"
                : "bg-gray-50 text-gray-400 group-hover:text-success-600 group-hover:bg-success-50"
                }`}
            >
              <IoChevronDownOutline size={20} />
            </div>
          </button>

          {completedPoliciesExpanded && (
            <div className="bg-gray-50/30 p-4 animate-slideDown">
              <FrappeListView
                doctype="Policy Details"
                isLoading={isCurrentEmployeeLoading}
                ItemComponent={PolicyItem}
                SkeletonComponent={PolicyItemSkeleton}
                defaultFilters={{
                  status: "Acknowledged",
                  employee_id: currentEmployee?.name || "",
                }}
                defaultFields={["name", "status", "policy", "sign_off_mandatory", "due_date"]}
                infiniteScroll={true}
                isSearch={true}
                isFilter={false}
                pageSize={10}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PoliciesEnforced;
