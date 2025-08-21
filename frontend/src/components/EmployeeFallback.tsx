import React from 'react';
import { AlertTriangle, User, RefreshCw } from 'lucide-react';

interface EmployeeFallbackProps {
  message?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  variant?: 'card' | 'banner' | 'minimal';
}

const EmployeeFallback: React.FC<EmployeeFallbackProps> = ({
  message = 'Unable to load employee information',
  showRetry = true,
  onRetry,
  variant = 'card'
}) => {
  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 p-2">
        <User className="w-4 h-4" />
        <span>{message}</span>
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="text-blue-500 hover:text-blue-700 ml-2"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">{message}</p>
            {showRetry && onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 text-sm text-yellow-800 hover:text-yellow-900 font-medium"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default card variant
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
      <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Employee Data Unavailable
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        {message}
      </p>
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </button>
      )}
    </div>
  );
};

export default EmployeeFallback;
