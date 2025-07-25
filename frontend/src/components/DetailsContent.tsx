import React from 'react';
import {
  FaFileAlt,
  FaDownload,
  FaBriefcase,
  FaUniversity,
  FaPlusCircle,
  FaEdit,
  FaShareAlt,
  FaThumbsDown
} from 'react-icons/fa';
import { JobApplicant } from '../types/jobApplicant';

interface DetailsContentProps {
  data: JobApplicant;
}

const DetailsContent: React.FC<DetailsContentProps> = ({ data }) => {
  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-bold text-lg mb-4">Basic Information</h3>
        <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
          <div>
            <p className="text-[var(--text-secondary)]">Email</p>
            <p className="font-medium">{data.email_id || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-[var(--text-secondary)]">Phone</p>
            <p className="font-medium">{data.phone_number || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-[var(--text-secondary)]">Location</p>
            <p className="font-medium">{data.country || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-[var(--text-secondary)]">Gender</p>
            <p className="font-medium">{data.custom_gender || 'Not provided'}</p>
          </div>
        </div>

        {data.resume_attachment && (
          <div className="mt-4 pt-4">
            <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-2">Resume</h4>
            <a
              className="flex items-center justify-between py-2 px-3 text-sm hover:bg-gray-50 rounded-md bg-gray-100 border border-gray-200"
              href={data.resume_attachment}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="flex items-center gap-2">
                <FaFileAlt className="text-[var(--primary-color)]" />
                <span className="font-medium">
                  {data.resume_attachment.split('/').pop()}
                </span>
              </div>
              <FaDownload className="text-[var(--text-secondary)]" />
            </a>
          </div>
        )}
      </div>

      {/* Static Employment History */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-bold text-lg mb-4">Employment History</h3>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <FaBriefcase className="text-[var(--text-secondary)]" />
            </div>
            <div>
              <p className="font-semibold text-base">
                {data.designation || 'Not added'}
              </p>
              <p className="text-sm">
                {data.source || 'Not added'}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {data.creation ? `${new Date(data.creation).getFullYear()} - Present` : 'Not added'}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {data.country || 'Not added'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Static Education History */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-bold text-lg mb-4">Education History</h3>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <FaUniversity className="text-[var(--text-secondary)]" />
            </div>
            <div>
              <p className="font-semibold text-base">
                {'Not added'}
              </p>
              <p className="text-sm">
                {'Not added'}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {'Not added'}
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* Next Steps */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-bold text-lg mb-3">Next Steps</h3>
        <div className="space-y-2">
          <button
            onClick={() => (window.open(`${window.location.origin}/app/interview/new`))}
            className="w-full flex items-center gap-3 py-3 px-4 text-left rounded-lg hover:bg-gray-100"
          >
            <FaPlusCircle className="text-[var(--primary-color)]" />
            <span className="font-medium text-sm">Create Interview</span>
          </button>
          <button className="w-full flex items-center gap-3 py-3 px-4 text-left rounded-lg hover:bg-gray-100">
            <FaEdit className="text-[var(--primary-color)]" />
            <span className="font-medium text-sm">Update Status</span>
          </button>
          <button className="w-full flex items-center gap-3 py-3 px-4 text-left rounded-lg hover:bg-gray-100">
            <FaShareAlt className="text-[var(--primary-color)]" />
            <span className="font-medium text-sm">Share Profile</span>
          </button>
          <button className="w-full flex items-center gap-3 py-3 px-4 text-left rounded-lg hover:bg-red-50">
            <FaThumbsDown className="text-red-500" />
            <span className="font-medium text-sm text-red-600">Reject Applicant</span>
          </button>
        </div>
      </div>

    </>
  );
};

export default DetailsContent;
