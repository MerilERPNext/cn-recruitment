import React from 'react';

export const PeerReviewSidebarSkeleton: React.FC = () => {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-5 animate-pulse w-full">
      <div className="h-3 w-40 bg-slate-500/20 rounded mb-4" />
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((item) => (
          <div key={item} className="flex items-center justify-between p-2 rounded-lg bg-slate-500/10">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-slate-500/20 shrink-0" />
              <div className="flex flex-col gap-1.5">
                <div className="h-3.5 w-28 bg-slate-500/20 rounded" />
                <div className="h-2.5 w-16 bg-slate-500/20 rounded" />
              </div>
            </div>
            <div className="h-3 w-8 bg-slate-500/20 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PeerReviewSidebarSkeleton;
