import React from 'react';

interface Step {
  id: string;
  title: string;
  description?: string;
  completed?: boolean;
  current?: boolean;
  optional?: boolean;
}

interface ProgressIndicatorProps {
  steps: Step[];
  currentStep?: number;
  showLabels?: boolean;
  variant?: 'linear' | 'circular' | 'numbered';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep = 0,
  showLabels = true,
  variant = 'linear',
  size = 'md',
  className = ''
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          height: 'h-1',
          circle: 'w-6 h-6',
          text: 'text-xs',
          spacing: 'space-x-2'
        };
      case 'lg':
        return {
          height: 'h-3',
          circle: 'w-10 h-10',
          text: 'text-base',
          spacing: 'space-x-6'
        };
      default:
        return {
          height: 'h-2',
          circle: 'w-8 h-8',
          text: 'text-sm',
          spacing: 'space-x-4'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  if (variant === 'linear') {
    const progress = ((currentStep + 1) / steps.length) * 100;
    
    return (
      <div className={`w-full ${className}`}>
        {/* Progress Bar */}
        <div className={`w-full bg-gray-200 rounded-full ${sizeClasses.height} mb-4`}>
          <div 
            className={`bg-gradient-to-r from-blue-500 to-blue-600 ${sizeClasses.height} rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${progress}%` }}
          >
            <div className={`${sizeClasses.height} bg-white bg-opacity-30 rounded-full animate-pulse`} />
          </div>
        </div>
        
        {/* Step Labels */}
        {showLabels && (
          <div className="flex justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="text-center flex-1">
                <div className={`${sizeClasses.text} font-medium ${
                  index <= currentStep ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  {step.title}
                </div>
                {step.description && (
                  <div className={`${sizeClasses.text} text-gray-500 mt-1`}>
                    {step.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'numbered') {
    return (
      <div className={`flex items-center justify-center ${sizeClasses.spacing} ${className}`}>
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              {/* Step Circle */}
              <div className={`
                ${sizeClasses.circle} rounded-full flex items-center justify-center font-semibold transition-all duration-300
                ${index < currentStep 
                  ? 'bg-green-500 text-white' 
                  : index === currentStep 
                    ? 'bg-blue-500 text-white ring-4 ring-blue-200' 
                    : 'bg-gray-200 text-gray-600'
                }
              `}>
                {index < currentStep ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className={sizeClasses.text}>{index + 1}</span>
                )}
              </div>
              
              {/* Step Label */}
              {showLabels && (
                <div className="mt-2 text-center">
                  <div className={`${sizeClasses.text} font-medium ${
                    index <= currentStep ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </div>
                  {step.optional && (
                    <div className="text-xs text-gray-400 mt-1">Optional</div>
                  )}
                </div>
              )}
            </div>
            
            {/* Connecting Line */}
            {index < steps.length - 1 && (
              <div className={`flex-1 ${sizeClasses.height} mx-2 ${
                index < currentStep ? 'bg-green-500' : 'bg-gray-200'
              } transition-colors duration-300`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  if (variant === 'circular') {
    const progress = ((currentStep + 1) / steps.length) * 100;
    const circumference = 2 * Math.PI * 45; // radius = 45
    const strokeDashoffset = circumference - (progress / 100) * circumference;
    
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <div className="relative w-32 h-32">
          {/* Background Circle */}
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="transparent"
            />
            {/* Progress Circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="url(#gradient)"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
            {/* Gradient Definition */}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(progress)}%
            </div>
            <div className="text-sm text-gray-500">Complete</div>
          </div>
        </div>
        
        {/* Current Step Info */}
        {showLabels && (
          <div className="mt-4 text-center">
            <div className="font-semibold text-gray-900">
              Step {currentStep + 1} of {steps.length}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {steps[currentStep]?.title}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default ProgressIndicator; 