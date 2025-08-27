import React, { ReactNode } from "react";
import { useScreenSize } from "../../hooks/useScreenSize";

interface ResponsiveFormWrapperProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const ResponsiveFormWrapper: React.FC<ResponsiveFormWrapperProps> = ({
  children,
  className = '',
  maxWidth = 'lg'
}) => {
  const { isDesktop } = useScreenSize();

  const getMaxWidthClass = () => {
    if (!isDesktop) return 'w-full';
    
    const widthMap = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
      '2xl': 'max-w-6xl',
      full: 'w-full'
    };
    
    return `${widthMap[maxWidth]} w-full`;
  };

  return (
    <div className={`mx-auto ${getMaxWidthClass()} ${className}`}>
      <div className={`${isDesktop ? 'space-y-6' : 'space-y-4'}`}>
        {children}
      </div>
    </div>
  );
};

// Form section component for better organization
interface FormSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className = ''
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

// Form field wrapper for consistent styling
interface FormFieldProps {
  label: string;
  children: ReactNode;
  required?: boolean;
  error?: string;
  description?: string;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  children,
  required = false,
  error,
  description,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
      {children}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

// Form actions wrapper
interface FormActionsProps {
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export const FormActions: React.FC<FormActionsProps> = ({
  children,
  align = 'right',
  className = ''
}) => {
  const alignClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  };

  return (
    <div className={`flex gap-3 pt-6 border-t border-gray-200 ${alignClass[align]} ${className}`}>
      {children}
    </div>
  );
};

export default ResponsiveFormWrapper;
