import { Formio } from '@formio/js';

// Global FormIO configuration with Tailwind styling
export const formioConfig = {
  // Base configuration
  noAlerts: true,
  readOnly: false,
  viewAsHtml: false,
  
  // Custom CSS classes for Tailwind styling
  builder: {
    // Builder styling
    builder: {
      className: 'bg-white rounded-lg shadow-sm border border-gray-200 p-6',
    },
  },
  
  // Form styling
  form: {
    className: 'space-y-6',
  },
  
  // Component styling
  components: {
    // Text field styling
    textfield: {
      className: 'formio-component-textfield',
      input: {
        className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors',
      },
      label: {
        className: 'block text-sm font-medium text-gray-700 mb-1',
      },
    },
    
    // Textarea styling
    textarea: {
      className: 'formio-component-textarea',
      input: {
        className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors min-h-[100px]',
      },
      label: {
        className: 'block text-sm font-medium text-gray-700 mb-1',
      },
    },
    
    // Select styling
    select: {
      className: 'formio-component-select',
      input: {
        className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white',
      },
      label: {
        className: 'block text-sm font-medium text-gray-700 mb-1',
      },
    },
    
    // Checkbox styling
    checkbox: {
      className: 'formio-component-checkbox',
      input: {
        className: 'h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded',
      },
      label: {
        className: 'ml-2 block text-sm text-gray-700',
      },
    },
    
    // Radio styling
    radio: {
      className: 'formio-component-radio',
      input: {
        className: 'h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300',
      },
      label: {
        className: 'ml-2 block text-sm text-gray-700',
      },
    },
    
    // Button styling
    button: {
      className: 'formio-component-button',
      input: {
        className: 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors',
      },
    },
    
    // Email styling
    email: {
      className: 'formio-component-email',
      input: {
        className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors',
      },
      label: {
        className: 'block text-sm font-medium text-gray-700 mb-1',
      },
    },
    
    // Number styling
    number: {
      className: 'formio-component-number',
      input: {
        className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors',
      },
      label: {
        className: 'block text-sm font-medium text-gray-700 mb-1',
      },
    },
    
    // Date styling
    datetime: {
      className: 'formio-component-datetime',
      input: {
        className: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors',
      },
      label: {
        className: 'block text-sm font-medium text-gray-700 mb-1',
      },
    },
  },
  
  // Error styling
  errors: {
    className: 'text-red-600 text-sm mt-1',
  },
  
  // Success styling
  success: {
    className: 'text-green-600 text-sm mt-1',
  },
  
  // Loading styling
  loading: {
    className: 'flex items-center justify-center p-4',
    spinner: {
      className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600',
    },
  },
};

// Initialize FormIO with global configuration
export const initializeFormIO = () => {
  // Set global FormIO options if available
  if (Formio.setBaseUrl) {
    Formio.setBaseUrl(process.env.REACT_APP_FORMIO_BASE_URL || '');
  }
};



export default formioConfig; 