
import React from 'react';
import { ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { JobApplicant } from '../../types/jobApplicant'; 
import Avatar from './Avatar'; 

interface ApplicantCardProps {
  item: JobApplicant;
  onClick: (item: JobApplicant) => void;
}

const ApplicantCard: React.FC<ApplicantCardProps> = ({ item, onClick }) => {
  return (
    <div
      className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
      onClick={() => onClick(item)}
    >
      {/* Pass name directly to Avatar */}
      <Avatar src={item.profile_image} name={item.applicant_name} size="h-12 w-12" />
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-gray-900 text-base font-semibold truncate">
            {item.applicant_name}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 mt-0.5">
          {item.designation && <span>{item.designation}</span>}
          {item.designation && item.creation && <span className="mx-1">|</span>}
          {item.creation && (
            <span>
              Applied{" "}
              {formatDistanceToNow(new Date(item.creation), {
                addSuffix: true,
              }).replace("about ", "")}
            </span>
          )}
        </div>
      </div>
      <button className="text-blue-500 flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-blue-50 active:bg-blue-100 transition-colors">
        <ChevronRight />
      </button>
    </div>
  );
};

export default ApplicantCard;