import React, { forwardRef, InputHTMLAttributes } from 'react';

interface SmartInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  type?: 'text' | 'email' | 'tel' | 'url' | 'search' | 'password' | 'number';
  label?: string;
  error?: string;
  success?: string;
  inputMode?: 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
  autoComplete?: string;
  spellCheck?: boolean;
  enhancedAutocomplete?: boolean;
}

const SmartInput = forwardRef<HTMLInputElement, SmartInputProps>(({
  type = 'text',
  label,
  error,
  success,
  inputMode,
  autoComplete,
  spellCheck = false,
  enhancedAutocomplete = true,
  className = '',
  ...props
}, ref) => {
  
  // Smart autocomplete mapping based on field names and types
  const getSmartAutocomplete = (name?: string, type?: string) => {
    if (!enhancedAutocomplete || autoComplete) return autoComplete;
    
    const nameMap: Record<string, string> = {
      // Personal information
      'firstName': 'given-name',
      'lastname': 'family-name',
      'fullName': 'name',
      'email': 'email',
      'phone': 'tel',
      'mobile': 'tel',
      'website': 'url',
      
      // Address information
      'address': 'street-address',
      'street': 'address-line1',
      'city': 'address-level2',
      'state': 'address-level1',
      'zip': 'postal-code',
      'country': 'country-name',
      
      // Professional information
      'company': 'organization',
      'position': 'organization-title',
      'jobTitle': 'organization-title',
      
      // Authentication
      'username': 'username',
      'password': 'current-password',
      'newPassword': 'new-password',
      'confirmPassword': 'new-password',
      
      // Payment information
      'cardNumber': 'cc-number',
      'cardName': 'cc-name',
      'cardExpiry': 'cc-exp',
      'cvv': 'cc-csc',
    };
    
    // Check by field name first
    if (name && nameMap[name]) {
      return nameMap[name];
    }
    
    // Check by type
    if (type === 'email') return 'email';
    if (type === 'tel') return 'tel';
    if (type === 'url') return 'url';
    
    return 'off';
  };

  // Smart input mode detection
  const getSmartInputMode = (type?: string, name?: string) => {
    if (inputMode) return inputMode;
    
    if (type === 'email') return 'email';
    if (type === 'tel' || name?.includes('phone')) return 'tel';
    if (type === 'url') return 'url';
    if (type === 'number') return 'numeric';
    if (name?.includes('search')) return 'search';
    
    return 'text';
  };

  const smartAutoComplete = getSmartAutocomplete(props.name, type);
  const smartInputMode = getSmartInputMode(type, props.name);

  const inputClasses = `
    w-full p-4 border-2 rounded-lg transition-all duration-300 
    focus:outline-none focus:ring-2 focus:ring-blue-500 
    ${error ? 'border-red-300 bg-red-50' : success ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-white'}
    ${className}
  `;

  return (
    <div className="space-y-1">
      {label && (
        <label 
          htmlFor={props.id || props.name} 
          className={`block text-sm font-medium ${error ? 'text-red-700' : 'text-gray-700'}`}
        >
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <input
        ref={ref}
        type={type}
        inputMode={smartInputMode}
        autoComplete={smartAutoComplete}
        spellCheck={spellCheck}
        data-lpignore="true" // Prevent LastPass interference
        className={inputClasses}
        {...props}
      />
      
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      
      {success && (
        <p className="text-sm text-green-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {success}
        </p>
      )}
    </div>
  );
});

SmartInput.displayName = 'SmartInput';

export default SmartInput; 