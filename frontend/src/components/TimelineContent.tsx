import React from 'react';
import { FaPhone, FaWhatsapp, FaEnvelope } from 'react-icons/fa';

const TimelineContent: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Timeline Section */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-bold text-lg mb-4">Applicant Timeline</h3>
        <div className="relative pl-6 space-y-6 border-l-2 border-gray-200">
          {/* Dot 1 */}
          <div className="absolute -left-[11px] top-1.5 w-5 h-5 bg-[var(--primary-color)] rounded-full border-4 border-white"></div>
          <div className="flex items-start gap-4">
            <div>
              <p className="font-semibold text-[var(--text-primary)]">Interview Scheduled</p>
              <p className="text-sm text-[var(--text-secondary)]">Technical Round with John Smith</p>
              <p className="text-xs text-gray-500 mt-1">Today, 10:30 AM</p>
            </div>
          </div>

          {/* Dot 2 */}
          <div className="absolute -left-[11px] top-[calc(50%-10px)] w-5 h-5 bg-gray-300 rounded-full border-4 border-white"></div>
          <div className="flex items-start gap-4">
            <div>
              <p className="font-semibold text-gray-600">Status Changed: Screening → Interview</p>
              <p className="text-sm text-[var(--text-secondary)]">Sub-status changed to HR Round.</p>
              <p className="text-xs text-gray-500 mt-1">Yesterday, 4:15 PM by Sarah Wilson</p>
            </div>
          </div>

          {/* Dot 3 */}
          <div className="absolute -left-[11px] bottom-1.5 w-5 h-5 bg-gray-300 rounded-full border-4 border-white"></div>
          <div className="flex items-start gap-4">
            <div>
              <p className="font-semibold text-gray-600">Application Submitted</p>
              <p className="text-sm text-[var(--text-secondary)]">Applied for Senior Frontend Developer role.</p>
              <p className="text-xs text-gray-500 mt-1">2 days ago, 11:00 AM</p>
            </div>
          </div>
        </div>
      </div>

      {/* Communication Section */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-bold text-lg mb-4">Communication History</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <FaWhatsapp className="text-green-500 mt-1" />
            <div>
              <p className="font-medium text-sm">WhatsApp message sent</p>
              <p className="text-xs text-[var(--text-secondary)]">Confirming interview schedule.</p>
              <p className="text-xs text-gray-400 mt-0.5">Today, 10:35 AM</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <FaPhone className="text-[var(--primary-color)] mt-1" />
            <div>
              <p className="font-medium text-sm">Outgoing call</p>
              <p className="text-xs text-[var(--text-secondary)]">Duration: 5m 32s. Spoke about role expectations.</p>
              <p className="text-xs text-gray-400 mt-0.5">Yesterday, 4:00 PM</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <FaEnvelope className="text-gray-400 mt-1" />
            <div>
              <p className="font-medium text-sm">Email sent</p>
              <p className="text-xs text-[var(--text-secondary)]">Invitation for initial screening call.</p>
              <p className="text-xs text-gray-400 mt-0.5">2 days ago, 2:00 PM</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineContent;
