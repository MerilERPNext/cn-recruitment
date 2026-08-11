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
    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:px-5 sm:py-4 rounded-md border border-gray-100 bg-white shadow-sm min-w-0 ${className}`}
  >
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div className="h-6 w-12 rounded-md bg-purple-100/80 shrink-0" />

      <div className="space-y-1.5 min-w-0 flex-1">
        <div className="h-4.5 w-44 sm:w-64 rounded bg-gray-200" />
        <div className="h-3 w-32 sm:w-40 rounded bg-gray-200" />
      </div>
    </div>

    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
      <div className="h-3.5 w-8 rounded bg-gray-200" />

      <div className="h-2 w-24 sm:w-28 rounded-md bg-gray-200" />

      <div className="h-7 w-20 rounded-md bg-gray-200 shrink-0" />
    </div>
  </div>
);


const HeaderSkeleton: React.FC<{ title?: string }> = ({ title }) => (
  <div className="flex items-center justify-between pb-3 min-w-0">
    {title ? (
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
    ) : (
      <div className="h-6 w-28 rounded bg-gray-200" />
    )}
    <div className="h-4 w-16 rounded bg-gray-200" />
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
      <div className={`space-y-4 animate-pulse ${className}`}>
        {showHeader && <HeaderSkeleton title={headerTitle} />}
        {children}
      </div>
    );
  }

  return (
    <div className={`min-w-0 space-y-3 animate-pulse ${className}`}>
      {showHeader && <HeaderSkeleton title={headerTitle} />}

      <div className="flex flex-col gap-3 min-w-0">
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
                className={`min-w-0 rounded-xl border border-gray-100 bg-white p-4 shadow-sm ${cardClassName}`}
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