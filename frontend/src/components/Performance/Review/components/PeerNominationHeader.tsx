import React from 'react';
import { Typography } from '../../../shared/atoms/Typography';
import Badge from '../../../shared/Badge';

interface PeerNominationHeaderProps {
  selectedCount: number;
  maxCount?: number;
}

export const PeerNominationHeader: React.FC<PeerNominationHeaderProps> = ({ selectedCount, maxCount = 4 }) => {
  return (
    <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
      <div>
        <div className="mb-4">
           <Badge label="Step 2 of 6 · Reviews" variant="purple" size="sm" />
        </div>
        <Typography variant="h3" className="mb-2 text-gray-900">Nominate Peer Reviewers</Typography>
        <Typography variant="bodyMedium" className="text-gray-600 max-w-2xl">
          Choose 4 people who've worked closely with you this cycle. Your manager will approve. Auto-suggestions from Slack, Jira and Figma below.
        </Typography>
      </div>
      <div className="flex flex-col items-end shrink-0 md:pl-6 md:border-l border-gray-100">
        <Typography variant="caption" className="text-gray-500 font-semibold tracking-wider mb-1">SELECTED</Typography>
        <div className="text-4xl font-brand text-blue-600 font-bold leading-none">
          {selectedCount} <span className="text-blue-600 text-3xl font-medium">/ {maxCount}</span>
        </div>
        <Typography variant="caption" className="text-gray-500 mt-2">min 3 · max 7</Typography>
      </div>
    </div>
  );
};
