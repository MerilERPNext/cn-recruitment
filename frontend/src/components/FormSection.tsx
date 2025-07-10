import React, { ReactNode } from 'react';

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  icon?: ReactNode;
}

const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className = '',
  collapsible = false,
  defaultExpanded = true,
  icon
}) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  return (
    <div className={`bg-gray-50 rounded-lg border-l-4 border-blue-500 mb-6 transition-all duration-300 ${className}`}>
      <div 
        className={`p-4 ${collapsible ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''}`}
        onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className="flex-shrink-0 text-blue-600">
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
              {description && (
                <p className="text-xs text-gray-600">{description}</p>
              )}
            </div>
          </div>
          {collapsible && (
            <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}
        </div>
      </div>
      
      <div className={`transition-all duration-300 overflow-hidden ${
        collapsible ? (isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0') : ''
      }`}>
        <div className="px-4 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default FormSection; 