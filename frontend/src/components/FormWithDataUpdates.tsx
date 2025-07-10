import React, { useState, useRef } from 'react';
import FormWrapper from './FormWrapper';

const FormWithDataUpdates: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [currentData, setCurrentData] = useState<any>({});
  const formInstanceRef = useRef<any>(null);

  // Mock data sources
  const userProfiles = {
    user1: {
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice.johnson@company.com',
      message: 'Senior Developer with 5 years experience',
      country: 'ca',
      newsletter: true
    },
    user2: {
      firstName: 'Bob',
      lastName: 'Smith',
      email: 'bob.smith@company.com',
      message: 'Product Manager specializing in user experience',
      country: 'uk',
      newsletter: false
    },
    user3: {
      firstName: 'Carol',
      lastName: 'Williams',
      email: 'carol.williams@company.com',
      message: 'UX Designer with expertise in accessibility',
      country: 'au',
      newsletter: true
    }
  };

  // Form schema
  const exampleForm = {
    display: 'form',
    components: [
      {
        type: 'textfield',
        key: 'firstName',
        label: 'First Name',
        placeholder: 'Enter your first name',
        input: true,
        required: true,
      },
      {
        type: 'textfield',
        key: 'lastName',
        label: 'Last Name',
        placeholder: 'Enter your last name',
        input: true,
        required: true,
      },
      {
        type: 'email',
        key: 'email',
        label: 'Email Address',
        placeholder: 'Enter your email address',
        input: true,
        required: true,
      },
      {
        type: 'textarea',
        key: 'message',
        label: 'Bio/Message',
        placeholder: 'Tell us about yourself',
        input: true,
        rows: 4,
      },
      {
        type: 'select',
        key: 'country',
        label: 'Country',
        placeholder: 'Select your country',
        input: true,
        data: {
          values: [
            { label: 'United States', value: 'us' },
            { label: 'Canada', value: 'ca' },
            { label: 'United Kingdom', value: 'uk' },
            { label: 'Australia', value: 'au' },
          ],
        },
      },
      {
        type: 'checkbox',
        key: 'newsletter',
        label: 'Subscribe to newsletter',
        input: true,
      },
      {
        key: 'submit',
        type: 'button',
        action: 'submit',
        label: 'Submit',
        theme: 'primary',
      },
    ],
  };

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setFormData(data);
      console.log('Form submitted:', data);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = (userId: keyof typeof userProfiles) => {
    const userData = userProfiles[userId];
    setCurrentData(userData);
    
    // If form is already ready, update it immediately
    if (formInstanceRef.current) {
      updateFormData(userData);
    }
  };

  const updateFormData = (newData: any) => {
    if (formInstanceRef.current) {
      console.log('Updating form with new data:', newData);
      
      // Update form submission data
      formInstanceRef.current.submission = {
        data: newData
      };
      
      // Update individual components
      Object.keys(newData).forEach((key) => {
        const component = formInstanceRef.current.getComponent(key);
        if (component) {
          component.setValue(newData[key]);
          component.redraw();
        }
      });
      
      // Redraw the entire form
      formInstanceRef.current.redraw();
    }
  };

  const clearForm = () => {
    const emptyData = {
      firstName: '',
      lastName: '',
      email: '',
      message: '',
      country: '',
      newsletter: false
    };
    setCurrentData(emptyData);
    updateFormData(emptyData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Dynamic Form Data Updates Example
          </h1>
          <p className="text-gray-600 mb-6">
            This example demonstrates how to use the formReady function to populate and update form fields with existing data.
          </p>
          
          {/* Data Loading Controls */}
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={() => loadUserData('user1')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Load Alice's Data
            </button>
            <button
              onClick={() => loadUserData('user2')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Load Bob's Data
            </button>
            <button
              onClick={() => loadUserData('user3')}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              Load Carol's Data
            </button>
            <button
              onClick={clearForm}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Clear Form
            </button>
          </div>
          
          {/* Current Data Display */}
          {Object.keys(currentData).length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                Current Form Data:
              </h3>
              <pre className="text-xs text-blue-700 bg-blue-100 p-2 rounded overflow-auto">
                {JSON.stringify(currentData, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Form */}
        <FormWrapper
          form={exampleForm}
          onSubmit={handleSubmit}
          loading={loading}
          initialData={currentData}
          onFormReady={(formInstance) => {
            console.log('Form is ready with instance:', formInstance);
            formInstanceRef.current = formInstance;
            
            // Example: Add custom validation or event listeners
            formInstance.on('change', (event: any) => {
              console.log('Form changed:', event);
            });
          }}
        />

        {/* Submission Result */}
        {formData && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-medium text-green-800 mb-2">
              Form Submitted Successfully!
            </h3>
            <pre className="text-sm text-green-700 bg-green-100 p-3 rounded overflow-auto">
              {JSON.stringify(formData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormWithDataUpdates; 