import React, { useState } from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import { RefreshCw, AlertCircle } from "lucide-react";

import DetailsContent from './DetailsContent';
import TimelineContent from './TimelineContent';
import NotesContent from './NotesContent';
import TopCard from './TopCard';
import { useJobApplicant, isPermissionError } from '../hooks/useJobApplicant';

const JobApplicantDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'notes'>('details');

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useJobApplicant(id || '', {
    enabled: !!id,
  });

  const handleBack = () => navigate(-1);

  // 🔄 Loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex items-center space-x-2 text-gray-500">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="text-lg">Loading applicant details...</span>
        </div>
      </div>
    );
  }

  // ❌ Error
  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Error Loading Applicant</h3>
          <p className="text-sm text-gray-600">
            {isPermissionError(error)
              ? "You don’t have permission to view this applicant. Please contact your administrator."
              : (error as Error).message}
          </p>
          <div className="flex justify-center gap-3 mt-2">
            <button
              onClick={() => {
                console.log("🔁 Retrying referral fetch...");
                refetch();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md"
            >
              <RefreshCw className="w-4 h-4 inline-block mr-1" />
              Try Again
            </button>
            <button
              onClick={handleBack}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md bg-white hover:bg-gray-50"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Applicant Not Found</h3>
          <p className="text-sm text-gray-600 mb-4">The requested applicant could not be found.</p>
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return <DetailsContent data={data} />;
      case 'timeline':
        return <TimelineContent />;
      case 'notes':
        return <NotesContent applicant={data} />;
      default:
        return null;
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col justify-between">
      <main className="flex-grow">
        <header className="sticky top-0 z-10 bg-white shadow-sm">
          <div className="flex items-center p-4">
            <button
              onClick={() => navigate(-1)}
              className="text-[var(--text-primary)] p-2 -ml-2"
            >
              <FaArrowLeft className="text-base" />
            </button>
            <h1 className="text-xl font-bold text-center flex-1 pr-8">
              Applicant Details
            </h1>
          </div>
        </header>

        <TopCard
          name={data.applicant_name}
          email={data.email_id || ""}
          phone_number={data.phone_number || ""}
          jobTitle={data.designation || ""}
          applicantId={data.name}
          status={data.status || "Open"}
          customSubStatus={data.custom_substatus || ""}
          refetch={refetch}
        />

        <div className="bg-white">
          <div className="flex justify-center gap-2 px-4 py-2">
            {[
              { label: 'Details', value: 'details' },
              { label: 'Timeline', value: 'timeline' },
              { label: 'Notes', value: 'notes' },
            ].map((tab) => (
              <div
                key={tab.value}
                onClick={() => setActiveTab(tab.value as typeof activeTab)}
                className={`flex-1 py-3 text-center text-sm font-medium cursor-pointer transition-all duration-200 ${activeTab === tab.value
                  ? 'border-b-2 border-[var(--primary-color)] text-[var(--primary-color)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--primary-color)]'
                  }`}
              >
                {tab.label}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-4">{renderTabContent()}</div>
      </main>
    </div>
  );
};

export default JobApplicantDetails;
