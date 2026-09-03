import React from 'react';

export const FeedbackFormSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col min-w-0 animate-pulse">
      {/* 1. Header Card Shimmer */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-4 sm:p-6 mb-6 flex flex-col sm:flex-row justify-between items-start">
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <div className="w-14 h-14 mx-auto rounded-full bg-slate-500/20 shrink-0" />
          <div className="flex flex-col justify-center flex-1 space-y-2">
            <div className="h-3.5 w-48 bg-slate-500/20 rounded" />
            <div className="h-5 w-72 bg-slate-500/20 rounded" />
            <div className="flex items-center gap-2">
              <div className="h-5 w-32 bg-slate-500/20 rounded-xl" />
              <div className="h-5 w-24 bg-slate-500/20 rounded-xl" />
            </div>
          </div>
        </div>
        <div className="flex flex-col items-start sm:items-end shrink-0 mt-4 sm:mt-0 space-y-1.5 w-24">
          <div className="h-3 w-12 bg-slate-500/20 rounded" />
          <div className="h-6 w-20 bg-slate-500/20 rounded" />
        </div>
      </div>

      {/* 2. Rating Cards Shimmers */}
      {[1, 2].map((card) => (
        <div key={card} className="bg-card rounded-xl shadow-sm border border-border p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
            <div className="mb-2 sm:mb-0 space-y-2 w-full">
              <div className="h-5 w-64 bg-slate-500/20 rounded" />
              <div className="h-3.5 w-4/5 bg-slate-500/20 rounded" />
            </div>
            <div className="h-5 w-24 bg-slate-500/20 rounded-xl shrink-0 mt-1" />
          </div>

          <div className="h-5 w-20 bg-slate-500/20 rounded-xl mb-4" />

          {/* 5 Buttons Shimmer */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 mb-6">
            {[1, 2, 3, 4, 5].map((btn) => (
              <div key={btn} className="h-20 bg-slate-500/10 rounded-lg border border-border" />
            ))}
          </div>

          {/* Comment Area Shimmer */}
          <div className="space-y-2">
            <div className="h-4 w-28 bg-slate-500/20 rounded" />
            <div className="h-24 bg-slate-500/10 rounded-lg border border-border" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default FeedbackFormSkeleton;
