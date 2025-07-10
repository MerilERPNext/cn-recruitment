import React, { useState, ReactNode } from 'react';

interface HelpTooltipProps {
  text: string | ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click';
  className?: string;
  iconSize?: 'sm' | 'md' | 'lg';
  variant?: 'info' | 'warning' | 'help' | 'success';
}

const HelpTooltip: React.FC<HelpTooltipProps> = ({
  text,
  position = 'top',
  trigger = 'hover',
  className = '',
  iconSize = 'md',
  variant = 'help'
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const getIconSizeClasses = () => {
    switch (iconSize) {
      case 'sm': return 'w-3 h-3';
      case 'lg': return 'w-5 h-5';
      default: return 'w-4 h-4';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'info':
        return {
          icon: 'text-blue-500 hover:text-blue-600',
          tooltip: 'bg-blue-900 text-blue-100 border-blue-700'
        };
      case 'warning':
        return {
          icon: 'text-yellow-500 hover:text-yellow-600',
          tooltip: 'bg-yellow-900 text-yellow-100 border-yellow-700'
        };
      case 'success':
        return {
          icon: 'text-green-500 hover:text-green-600',
          tooltip: 'bg-green-900 text-green-100 border-green-700'
        };
      default:
        return {
          icon: 'text-gray-400 hover:text-gray-600',
          tooltip: 'bg-gray-900 text-white border-gray-700'
        };
    }
  };

  const getPositionClasses = () => {
    const base = 'absolute z-50 px-3 py-2 text-sm rounded-lg shadow-lg border transition-all duration-200';
    
    switch (position) {
      case 'top':
        return `${base} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
      case 'bottom':
        return `${base} top-full left-1/2 transform -translate-x-1/2 mt-2`;
      case 'left':
        return `${base} right-full top-1/2 transform -translate-y-1/2 mr-2`;
      case 'right':
        return `${base} left-full top-1/2 transform -translate-y-1/2 ml-2`;
      default:
        return `${base} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
    }
  };

  const getArrowClasses = () => {
    const arrowBase = 'absolute w-2 h-2 transform rotate-45 border';
    const { tooltip } = getVariantClasses();
    const borderColor = tooltip.includes('bg-blue') ? 'border-blue-700' :
                       tooltip.includes('bg-yellow') ? 'border-yellow-700' :
                       tooltip.includes('bg-green') ? 'border-green-700' :
                       'border-gray-700';
    
    switch (position) {
      case 'top':
        return `${arrowBase} ${borderColor} bg-inherit top-full left-1/2 transform -translate-x-1/2 -mt-1 border-t-0 border-l-0`;
      case 'bottom':
        return `${arrowBase} ${borderColor} bg-inherit bottom-full left-1/2 transform -translate-x-1/2 -mb-1 border-b-0 border-r-0`;
      case 'left':
        return `${arrowBase} ${borderColor} bg-inherit left-full top-1/2 transform -translate-y-1/2 -ml-1 border-l-0 border-t-0`;
      case 'right':
        return `${arrowBase} ${borderColor} bg-inherit right-full top-1/2 transform -translate-y-1/2 -mr-1 border-r-0 border-b-0`;
      default:
        return `${arrowBase} ${borderColor} bg-inherit top-full left-1/2 transform -translate-x-1/2 -mt-1 border-t-0 border-l-0`;
    }
  };

  const variantClasses = getVariantClasses();
  const iconClasses = getIconSizeClasses();

  const handleMouseEnter = () => {
    if (trigger === 'hover') setIsVisible(true);
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') setIsVisible(false);
  };

  const handleClick = () => {
    if (trigger === 'click') setIsVisible(!isVisible);
  };

  const Icon = () => {
    switch (variant) {
      case 'info':
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'success':
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        className={`${variantClasses.icon} transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-full p-0.5`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        aria-label="Help information"
        aria-expanded={isVisible}
      >
        <Icon />
      </button>

      {isVisible && (
        <div className={`${getPositionClasses()} ${variantClasses.tooltip} animate-in fade-in-0 zoom-in-95 duration-200`}>
          <div className="max-w-xs">
            {typeof text === 'string' ? (
              <p className="text-sm leading-relaxed">{text}</p>
            ) : (
              text
            )}
          </div>
          <div className={getArrowClasses()} />
        </div>
      )}

      {/* Click away overlay for click trigger */}
      {isVisible && trigger === 'click' && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsVisible(false)}
        />
      )}
    </div>
  );
};

export default HelpTooltip; 