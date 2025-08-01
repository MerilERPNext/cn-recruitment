import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FrappeListView from './ListView';
import { useCurrentEmployee } from '../hooks/useEmployee';

// Skeleton component for loading states
const PolicyItemSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          {/* Title skeleton */}
          <div className="h-5 bg-gray-300 rounded-md w-3/4 mb-2"></div>
          {/* Version skeleton */}
          <div className="h-4 bg-gray-200 rounded-md w-1/2"></div>
        </div>
        {/* Status badge skeleton */}
        <div className="h-7 bg-gray-300 rounded-2xl w-20 ml-4 shadow-sm border border-gray-200"></div>
      </div>
      {/* Button skeleton */}
      <div className="h-10 bg-gray-300 rounded-md w-full"></div>
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
  };
  index?: number;
  doctype: string;
}

const PolicyItem: React.FC<PolicyItemProps> = ({ item }) => {
  const navigate = useNavigate();
  
  // Handle both static data format and Frappe document format
  const title = item.policy || 'Untitled Policy';
  const status = item.status || 'Incomplete';
  const policyId = item.name;

  const handleViewPolicy = () => {
    navigate(`/webapp/policies-enforced/view/${policyId}`);
  };

  const isComplete = status === 'Complete' || status === 'Completed' || status === 'Acknowledged';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900 mb-1">
            {title}
          </h4>
          <p className="text-sm text-gray-500">
            {item.sign_off_mandatory ? 'Mandatory' : 'Optional'}
          </p>
        </div>
        <span className={`inline-flex items-center px-3 py-1.5 rounded-2xl text-xs font-semibold shadow-sm border transition-all duration-200 ${
          isComplete 
            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
            : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
        }`}>
          {isComplete ? 'Complete' : 'Incomplete'}
        </span>
      </div>
      <button
        onClick={handleViewPolicy}
        disabled={isComplete}
        className={`w-full font-medium py-2 px-4 rounded-md transition-colors ${
          isComplete
            ? 'bg-gray-400 text-white cursor-not-allowed'
            : 'bg-red-600 hover:bg-red-700 text-white'
        }`}
      >
        {isComplete ? 'Completed' : 'View & Sign Off'}
      </button>
    </div>
  );
};

const PoliciesEnforced: React.FC = () => {
  const [mandatoryPoliciesExpanded, setMandatoryPoliciesExpanded] = useState(true);
  const [completedPoliciesExpanded, setCompletedPoliciesExpanded] = useState(false);
  const {data: currentEmployee } = useCurrentEmployee();

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white min-h-screen">
      {/* Action Required Alert */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 mb-1">
              Action Required
            </h3>
            <p className="text-sm text-red-700">
              You must complete all mandatory policies before your departure. System access will be blocked until completion.
            </p>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      {/* <div className="mb-6"> */}
        {/* <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">
            {incompleteCount} Policies Incomplete
          </h2>
          <span className="text-sm text-gray-500">
            {progressPercentage}%
          </span>
        </div> */}
        {/* <div className="w-full bg-gray-200 h-3 rounded-md shadow-inner overflow-hidden">
          <div
            className="bg-gradient-to-r from-red-500 to-red-600 h-full rounded-md transition-all duration-500 ease-out shadow-sm relative"
            style={{ width: `${progressPercentage}%` }}
          >
            <div className="absolute inset-0 bg-white bg-opacity-20 rounded-md"></div>
          </div>
        </div> */}
      {/* </div> */}

      {/* Mandatory Policies Section */}
      <div className="mb-6">
        <button
          onClick={() => setMandatoryPoliciesExpanded(!mandatoryPoliciesExpanded)}
          className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <h3 className="text-base font-medium text-gray-900">
            Mandatory Policies
          </h3>
          <svg
            className={`w-5 h-5 text-gray-500 transform transition-transform ${
              mandatoryPoliciesExpanded ? 'rotate-180' : ''
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {mandatoryPoliciesExpanded && (
          <div className="mt-4 space-y-4">
            <FrappeListView
              doctype="Policy Details"
              ItemComponent={PolicyItem}
              SkeletonComponent={PolicyItemSkeleton}
              defaultFilters={{ status: "Pending", employee_id: currentEmployee?.name || "" }}
              defaultFields={["name", "status", "policy", "sign_off_mandatory"]}
              infiniteScroll={true}
              isSearch={true}
              isFilter={false}
              pageSize={10}
              showRefereshButton={false}
            />
          </div>
        )}
      </div>

      {/* Completed Policies Section */}
      <div className="mb-6">
        <button
          onClick={() => setCompletedPoliciesExpanded(!completedPoliciesExpanded)}
          className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <h3 className="text-base font-medium text-gray-900">
            Completed Policies
          </h3>
          <svg
            className={`w-5 h-5 text-gray-500 transform transition-transform ${
              completedPoliciesExpanded ? 'rotate-180' : ''
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {completedPoliciesExpanded && (
          <div className="mt-4 space-y-4">
            <FrappeListView
              doctype="Policy Details"
              ItemComponent={PolicyItem}
              SkeletonComponent={PolicyItemSkeleton}
              defaultFilters={{ status: "Acknowledged", employee_id: currentEmployee?.name || "" }}
              defaultFields={["name", "status", "policy"]}
              infiniteScroll={true}
              isSearch={true}
              isFilter={false}
              pageSize={10}
              showRefereshButton={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PoliciesEnforced;
