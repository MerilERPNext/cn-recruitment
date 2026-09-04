import React from 'react';

export interface PerformanceSkeletonProps {
  count?: number;
  showHeader?: boolean;
  headerTitle?: string;
  cardContent?: React.ReactNode | ((index: number) => React.ReactNode);
  renderCard?: (index: number) => React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  cardClassName?: string;
}

const DefaultCardContent: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl border border-border bg-card shadow-sm min-w-0 max-w-full overflow-hidden ${className}`}
  >
    {/* Left Section: OKR Badge + Title & Subtitle */}
    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 max-w-full">
      <div className="h-6 w-11 sm:w-12 rounded-md bg-purple-500/20 shrink-0" />
      <div className="space-y-1.5 min-w-0 flex-1 max-w-full">
        <div className="h-4 sm:h-4.5 w-3/4 max-w-[200px] sm:max-w-[240px] rounded bg-slate-500/20" />
        <div className="h-3 w-1/2 max-w-[130px] rounded bg-slate-500/20" />
      </div>
    </div>

    {/* Right Section: Percentage + Progress Bar + Status Pill */}
    <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 shrink-0 min-w-0 max-w-full pt-2 sm:pt-0 border-t sm:border-t-0 border-border flex-wrap sm:flex-nowrap">
      <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
        <div className="h-3.5 w-7 sm:w-8 rounded bg-slate-500/20 shrink-0" />
        <div className="h-2 w-16 sm:w-28 rounded-md bg-slate-500/20 flex-1 sm:flex-initial max-w-[120px]" />
      </div>
      <div className="h-6 sm:h-7 w-16 sm:w-20 rounded-md bg-slate-500/20 shrink-0" />
    </div>
  </div>
);

const HeaderSkeleton: React.FC<{ title?: string }> = ({ title }) => (
  <div className="flex items-center justify-between pb-3 min-w-0 max-w-full">
    {title ? (
      <h3 className="text-lg font-semibold text-text-title truncate">{title}</h3>
    ) : (
      <div className="h-6 w-28 rounded bg-slate-500/20 max-w-[50%]" />
    )}
    <div className="h-4 w-16 rounded bg-slate-500/20 shrink-0" />
  </div>
);

export const PerformanceSkeleton: React.FC<PerformanceSkeletonProps> = ({
  count = 4,
  showHeader = false,
  headerTitle,
  cardContent,
  renderCard,
  children,
  className = '',
  cardClassName = '',
}) => {
  if (children) {
    return (
      <div className={`space-y-4 animate-pulse min-w-0 max-w-full overflow-hidden ${className}`}>
        {showHeader && <HeaderSkeleton title={headerTitle} />}
        {children}
      </div>
    );
  }

  return (
    <div className={`min-w-0 max-w-full space-y-3 animate-pulse overflow-hidden ${className}`}>
      {showHeader && <HeaderSkeleton title={headerTitle} />}

      <div className="flex flex-col gap-3 min-w-0 max-w-full">
        {Array.from({ length: count }).map((_, index) => {
          const customUI = renderCard
            ? renderCard(index)
            : typeof cardContent === 'function'
            ? cardContent(index)
            : cardContent;

          if (customUI) {
            return (
              <div
                key={index}
                className={`min-w-0 max-w-full rounded-xl border border-border bg-card p-3.5 sm:p-4 shadow-sm overflow-hidden ${cardClassName}`}
              >
                {customUI}
              </div>
            );
          }

          return <DefaultCardContent key={index} className={cardClassName} />;
        })}
      </div>
    </div>
  );
};

export default PerformanceSkeleton;