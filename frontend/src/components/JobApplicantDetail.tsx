import React, { useState } from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import DetailsContent from './DetailsContent';
import TimelineContent from './TimelineContent';
import NotesContent from './NotesContent';
import TopCard from './TopCard';
import { useJobApplicant } from '../hooks/useJobApplicant';

const JobApplicantDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'notes'>('details');

  const {
    data,
    isLoading,
    isError,
    error,
  } = useJobApplicant(id || '', {
    enabled: !!id,
    //yha pe id check kr rhe hai hai 
  });

  if (!id) {
    return <p className="p-4 text-red-500">No applicant ID found in URL.</p>;
  }

  // Handle loading and error before using `data`
  if (isLoading) return <p className="p-4">Loading applicant...</p>;
  if (isError) return <p className="p-4 text-red-500">Error: {(error as Error).message}</p>;
  if (!data) return <p className="p-4 text-red-500">No data found for this applicant.</p>;

  // Now safe to use `data` (guaranteed to be defined)
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

        {/* Top summary card */}
       <TopCard
  name={data.applicant_name}
  email={data.email_id || ""}
  jobTitle={data.designation || ""}
  applicantId={data.name}
  status={data.status || "Open"}
  customSubStatus={data.custom_substatus || ""}
/>



        {/* Tab buttons */}
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

        {/* Active tab content */}
        <div className="p-4 space-y-4">{renderTabContent()}</div>
      </main>
    </div>
  );
};

export default JobApplicantDetails;
