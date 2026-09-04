import React from 'react';
import { FileText } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';

export interface AnonymousInfoCardProps {
  title?: string;
  note?: string;
  className?: string;
}

export const AnonymousInfoCard: React.FC<AnonymousInfoCardProps> = ({
  title = "YOUR FEEDBACK IS ANONYMOUS",
  note = "Your feedback is anonymous. Aggregated peer scores are shared only if at least 2 peers submit. Comments are shared verbatim without attribution.",
  className = "",
}) => {
  return (
    <div className={`bg-primary/10 rounded-xl border border-primary/20 p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-3 text-primary font-semibold text-sm tracking-wide">
        <FileText className="w-4 h-4" /> {title}
      </div>
      <Typography variant="bodyMedium" color="body2" className="leading-relaxed text-sm">
        {note}
      </Typography>
    </div>
  );
};
