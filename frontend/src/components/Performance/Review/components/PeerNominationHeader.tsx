import React from 'react';
import { Typography } from '../../../shared/atoms/Typography';
import Badge from '../../../shared/Badge';

interface PeerNominationHeaderProps {
  selectedCount: number;
  maxCount?: number;
}

export const PeerNominationHeader: React.FC<PeerNominationHeaderProps> = ({ selectedCount, maxCount = 4 }) => {
  return (
    <div className="flex min-w-0 flex-col gap-5 border-b border-gray-100 p-4 sm:p-6 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="mb-3 sm:mb-4">
           <Badge label="Step 2 of 6 · Reviews" variant="purple" size="sm" />
        </div>
        <Typography variant="h3" className="mb-2 break-words text-xl leading-tight text-gray-900 sm:text-2xl">Nominate Peer Reviewers</Typography>
        <Typography variant="bodyMedium" className="max-w-2xl break-words text-gray-600">
          Choose 4 people who've worked closely with you this cycle. Your manager will approve. Auto-suggestions from Slack, Jira and Figma below.
        </Typography>
      </div>
      <div className="flex shrink-0 flex-col items-start border-gray-100 md:items-end md:border-l md:pl-6">
        <Typography variant="caption" className="text-gray-500 font-semibold tracking-wider mb-1">SELECTED</Typography>
        <div className="font-brand text-4xl font-bold leading-none text-blue-600">
          {selectedCount} <span className="text-blue-600 text-3xl font-medium">/ {maxCount}</span>
        </div>
        <Typography variant="caption" className="text-gray-500 mt-2">min 3 · max 7</Typography>
      </div>
    </div>
  );
};
