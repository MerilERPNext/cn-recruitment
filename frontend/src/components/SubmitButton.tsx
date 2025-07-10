import React, { ReactNode } from 'react';

interface SubmitButtonProps {
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  loadingText?: string;
  successText?: string;
  showSuccess?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

const SubmitButton: React.FC<SubmitButtonProps> = ({
  loading = false,
  disabled = false,
  children,
  onClick,
  type = 'submit',
  className = '',
  loadingText = 'Processing...',
  successText = 'Success!',
  showSuccess = false,
  variant = 'primary'
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50';
      case 'danger':
        return 'bg-red-600 text-white border-red-600 hover:bg-red-700';
      default:
        return 'bg-gradient-to-r from-gray-900 to-gray-800 text-white border-gray-700 hover:from-gray-800 hover:to-gray-700';
    }
  };

  const isDisabled = loading || disabled || showSuccess;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        relative w-full px-6 py-3 rounded-lg font-medium border-2 transition-all duration-300 
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        disabled:opacity-70 disabled:cursor-not-allowed
        ${getVariantClasses()}
        ${className}
      `}
    >
      {/* Success State */}
      {showSuccess && (
        <div className="flex items-center justify-center">
          <svg 
            className="w-5 h-5 mr-2 text-green-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 13l4 4L19 7" 
            />
          </svg>
          <span>{successText}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && !showSuccess && (
        <div className="flex items-center justify-center">
          <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2" />
          <span>{loadingText}</span>
        </div>
      )}

      {/* Default State */}
      {!loading && !showSuccess && (
        <span className="flex items-center justify-center">
          {children}
        </span>
      )}

      {/* Ripple Effect */}
      {!isDisabled && (
        <span className="absolute inset-0 rounded-lg bg-white opacity-0 hover:opacity-10 transition-opacity duration-300" />
      )}
    </button>
  );
};

export default SubmitButton; 